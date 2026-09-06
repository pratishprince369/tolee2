/**
 * Tolee Centralized Error Handler & Information Leakage Prevention
 *
 * Ensures stack traces, raw SQL queries, internal paths, and secret tokens
 * are NEVER exposed to client-side users in production.
 * Redacts sensitive fields from server-side debug logs.
 */

import { NextResponse } from 'next/server';

export interface FormattedErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: any; // Only populated in development mode
}

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /apiKey/i,
  /api_key/i,
  /authorization/i,
  /cookie/i,
  /credential/i,
];

/**
 * Recursively redacts sensitive keys from objects before logging
 */
export function sanitizeLogData(data: any): any {
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    // Redact JWT tokens
    if (data.startsWith('ey') && data.includes('.')) {
      return '[REDACTED_JWT]';
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeLogData);
  }

  if (typeof data === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      const isSensitive = SENSITIVE_KEY_PATTERNS.some(pattern => pattern.test(key));
      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeLogData(value);
      }
    }
    return sanitized;
  }

  return data;
}

/**
 * Safely logs errors server-side with context while protecting user secrets
 */
export function logServerError(context: string, error: unknown, metadata?: Record<string, any>): void {
  const timestamp = new Date().toISOString();
  const sanitizedMeta = metadata ? sanitizeLogData(metadata) : undefined;
  
  if (error instanceof Error) {
    console.error(`[${timestamp}] [ERROR] [${context}] ${error.name}: ${error.message}`, {
      stack: error.stack,
      ...(sanitizedMeta ? { meta: sanitizedMeta } : {}),
    });
  } else {
    console.error(`[${timestamp}] [ERROR] [${context}]`, error, sanitizedMeta);
  }
}

/**
 * Formats a safe, generic error response for client consumption
 */
export function formatSafeError(
  error: unknown,
  fallbackMessage = 'Something went wrong. Please try again.',
  context = 'API'
): FormattedErrorResponse {
  const isDev = process.env.NODE_ENV === 'development';

  logServerError(context, error);

  // Check for common known safe error patterns
  if (error instanceof Error) {
    const msg = error.message;

    // Prisma Known Request Errors
    if ((error as any).code === 'P2002') {
      return {
        success: false,
        error: 'A record with this information already exists.',
        code: 'CONFLICT',
      };
    }

    if ((error as any).code === 'P2025') {
      return {
        success: false,
        error: 'The requested resource was not found.',
        code: 'NOT_FOUND',
      };
    }

    // Specific user-safe business logic errors
    const safeErrorKeywords = [
      'unauthorized',
      'unauthenticated',
      'forbidden',
      'invalid credentials',
      'user not found',
      'suspended',
      'banned',
      'unverified',
      'too many requests',
      'file size exceeds',
      'invalid file type',
      'message cannot be empty',
      'cannot follow yourself',
    ];

    const isExplicitlySafe = safeErrorKeywords.some(k => msg.toLowerCase().includes(k));
    if (isExplicitlySafe) {
      return {
        success: false,
        error: msg,
      };
    }
  }

  // Production generic fallback (never leaks stack traces, paths, or SQL details)
  return {
    success: false,
    error: isDev && error instanceof Error ? error.message : fallbackMessage,
    ...(isDev && error instanceof Error ? { details: error.stack } : {}),
  };
}

/**
 * Returns a standardized Next.js JSON error response
 */
export function createSafeErrorResponse(
  error: unknown,
  status = 500,
  fallbackMessage = 'Something went wrong. Please try again.',
  context = 'API_ROUTE'
) {
  const formatted = formatSafeError(error, fallbackMessage, context);
  return NextResponse.json(formatted, { status });
}
