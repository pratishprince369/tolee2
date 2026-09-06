/**
 * Tolee Strict Input Validation & Mass-Assignment Protection
 *
 * Lightweight, zero-dependency server-side validation utilities.
 * Validates types, bounds, formats, enums, pagination, and strips unwhitelisted fields.
 */

import { SECURITY_CONFIG } from './security-config';

export interface StringValidationOptions {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  trim?: boolean;
}

export interface NumberValidationOptions {
  required?: boolean;
  min?: number;
  max?: number;
  integer?: boolean;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Validates a string input against length, pattern, and required constraints.
 */
export function validateString(
  value: unknown,
  options: StringValidationOptions = {}
): ValidationResult<string> {
  const { required = false, min = 0, max = Infinity, pattern, trim = true } = options;

  if (value === undefined || value === null || value === '') {
    if (required) {
      return { success: false, error: 'This field is required.' };
    }
    return { success: true, data: '' };
  }

  if (typeof value !== 'string') {
    return { success: false, error: 'Invalid input format.' };
  }

  const processed = trim ? value.trim() : value;

  if (processed.length < min) {
    return { success: false, error: `Must be at least ${min} characters long.` };
  }

  if (processed.length > max) {
    return { success: false, error: `Cannot exceed ${max} characters.` };
  }

  if (pattern && !pattern.test(processed)) {
    return { success: false, error: 'Input does not match required format.' };
  }

  return { success: true, data: processed };
}

/**
 * Validates a numeric input against range and integer constraints.
 */
export function validateNumber(
  value: unknown,
  options: NumberValidationOptions = {}
): ValidationResult<number> {
  const { required = false, min = -Infinity, max = Infinity, integer = false } = options;

  if (value === undefined || value === null) {
    if (required) {
      return { success: false, error: 'This field is required.' };
    }
    return { success: true, data: undefined };
  }

  const num = typeof value === 'number' ? value : Number(value);

  if (isNaN(num) || !isFinite(num)) {
    return { success: false, error: 'Must be a valid number.' };
  }

  if (integer && !Number.isInteger(num)) {
    return { success: false, error: 'Must be an integer.' };
  }

  if (num < min) {
    return { success: false, error: `Must be at least ${min}.` };
  }

  if (num > max) {
    return { success: false, error: `Cannot exceed ${max}.` };
  }

  return { success: true, data: num };
}

/**
 * Validates that an input matches one of the allowed enum values.
 */
export function validateEnum<T extends string>(
  value: unknown,
  allowedValues: readonly T[] | T[],
  required = false
): ValidationResult<T> {
  if (value === undefined || value === null || value === '') {
    if (required) {
      return { success: false, error: 'This field is required.' };
    }
    return { success: true, data: undefined };
  }

  if (typeof value !== 'string' || !allowedValues.includes(value as T)) {
    return { success: false, error: 'Invalid selection.' };
  }

  return { success: true, data: value as T };
}

/**
 * Validates pagination parameters to prevent resource exhaustion attacks (?limit=99999999).
 */
export function validatePagination(
  pageParam?: unknown,
  limitParam?: unknown,
  maxLimit: number = SECURITY_CONFIG.INPUT_BOUNDS.MAX_PAGE_SIZE
): { page: number; limit: number; skip: number } {
  const parsedPage = typeof pageParam === 'number' ? pageParam : parseInt(String(pageParam || '1'), 10);
  const parsedLimit = typeof limitParam === 'number' ? limitParam : parseInt(String(limitParam || SECURITY_CONFIG.INPUT_BOUNDS.DEFAULT_PAGE_SIZE), 10);

  const page = isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
  const limit = isNaN(parsedLimit) || parsedLimit < 1 ? SECURITY_CONFIG.INPUT_BOUNDS.DEFAULT_PAGE_SIZE : Math.min(parsedLimit, maxLimit);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Strips any sensitive or unwhitelisted fields from an input object
 * to prevent Mass-Assignment vulnerabilities (e.g. { role: 'admin', isVerified: true }).
 */
export function sanitizeObjectWhitelist<T extends Record<string, any>>(
  input: unknown,
  allowedKeys: readonly (keyof T)[] | (keyof T)[]
): Partial<T> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }

  const result: Partial<T> = {};
  const raw = input as Record<string, any>;

  for (const key of allowedKeys as string[]) {
    // Ensure protected fields are never assigned even if mistakenly listed in allowed keys
    if (SECURITY_CONFIG.PROTECTED_USER_FIELDS.includes(key as any)) {
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(raw, key) && raw[key] !== undefined) {
      result[key as keyof T] = raw[key];
    }
  }

  return result;
}
