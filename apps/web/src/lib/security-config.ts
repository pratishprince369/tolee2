/**
 * Tolee Centralized Security Configuration
 *
 * Configurable thresholds for rate limits, file uploads, input lengths, and pagination.
 * All thresholds support environment variable overrides with secure production defaults.
 */

function parseEnvInt(key: string, fallback: number): number {
  const val = process.env[key];
  if (!val) return fallback;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) || parsed <= 0 ? fallback : parsed;
}

export const SECURITY_CONFIG = {
  // ── Rate Limiting Thresholds ──
  RATE_LIMITS: {
    // Authentication endpoints (login, signup, OTP, password reset): attempts per window
    AUTH: {
      LIMIT: parseEnvInt('RATE_LIMIT_AUTH_COUNT', 5),
      WINDOW_MS: parseEnvInt('RATE_LIMIT_AUTH_WINDOW_MS', 15 * 60 * 1000), // 15 minutes
      MAX_BACKOFF_DELAY_MS: parseEnvInt('RATE_LIMIT_AUTH_MAX_BACKOFF_MS', 30 * 1000), // 30s max progressive delay
    },
    // Write operations (creating posts, comments, messages, reactions)
    WRITE: {
      LIMIT: parseEnvInt('RATE_LIMIT_WRITE_COUNT', 30),
      WINDOW_MS: parseEnvInt('RATE_LIMIT_WRITE_WINDOW_MS', 5 * 60 * 1000), // 5 minutes
    },
    // AI endpoints (AI manager, AI generation, voice companion, resume builder)
    AI: {
      LIMIT: parseEnvInt('RATE_LIMIT_AI_COUNT', 10),
      WINDOW_MS: parseEnvInt('RATE_LIMIT_AI_WINDOW_MS', 60 * 1000), // 1 minute
    },
    // File upload endpoints
    UPLOAD: {
      LIMIT: parseEnvInt('RATE_LIMIT_UPLOAD_COUNT', 15),
      WINDOW_MS: parseEnvInt('RATE_LIMIT_UPLOAD_WINDOW_MS', 5 * 60 * 1000), // 5 minutes
    },
    // Search endpoints
    SEARCH: {
      LIMIT: parseEnvInt('RATE_LIMIT_SEARCH_COUNT', 60),
      WINDOW_MS: parseEnvInt('RATE_LIMIT_SEARCH_WINDOW_MS', 60 * 1000), // 1 minute
    },
    // Public read endpoints (feeds, discovery, public profiles)
    PUBLIC: {
      LIMIT: parseEnvInt('RATE_LIMIT_PUBLIC_COUNT', 120),
      WINDOW_MS: parseEnvInt('RATE_LIMIT_PUBLIC_WINDOW_MS', 60 * 1000), // 1 minute
    },
  },

  // ── File Upload Size Limits ──
  UPLOAD_LIMITS: {
    IMAGE_MAX_SIZE: parseEnvInt('UPLOAD_MAX_IMAGE_BYTES', 10 * 1024 * 1024),    // 10MB
    VIDEO_MAX_SIZE: parseEnvInt('UPLOAD_MAX_VIDEO_BYTES', 100 * 1024 * 1024),  // 100MB
    AUDIO_MAX_SIZE: parseEnvInt('UPLOAD_MAX_AUDIO_BYTES', 25 * 1024 * 1024),   // 25MB
    DOC_MAX_SIZE: parseEnvInt('UPLOAD_MAX_DOC_BYTES', 25 * 1024 * 1024),       // 25MB
  },

  // ── Input Length & Complexity Bounds ──
  INPUT_BOUNDS: {
    MAX_POST_LENGTH: parseEnvInt('MAX_POST_LENGTH', 5000),
    MAX_MESSAGE_LENGTH: parseEnvInt('MAX_MESSAGE_LENGTH', 5000),
    MAX_COMMENT_LENGTH: parseEnvInt('MAX_COMMENT_LENGTH', 2000),
    MAX_SEARCH_LENGTH: parseEnvInt('MAX_SEARCH_LENGTH', 100),
    MAX_NAME_LENGTH: 100,
    MAX_BIO_LENGTH: 500,
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: parseEnvInt('MAX_PAGE_SIZE', 50),
  },

  // ── Sensitive Fields Whitelist/Blacklist for Mass-Assignment Protection ──
  PROTECTED_USER_FIELDS: [
    'role',
    'isAdmin',
    'isVerified',
    'isBanned',
    'isSuspended',
    'email_verified',
    'emailVerified',
    'passwordHash',
    'points',
    'creditBalance',
    'messagingRestricted',
  ] as const,
};
