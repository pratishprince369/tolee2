/**
 * WhatsApp-Style Timezone & Presence Utilities
 * 
 * Provides robust IANA timezone conversion, Daylight Saving Time (DST) support,
 * and WhatsApp-spec formatting for messages, date separators, chat list timestamps,
 * and Last Seen indicators.
 */

const DEFAULT_TIMEZONE = 'Asia/Kolkata';

/**
 * Resolves the active user timezone with priority:
 * 1. Explicit user-saved preference in localStorage
 * 2. Browser/device IANA timezone via Intl API
 * 3. Safe fallback ('Asia/Kolkata')
 */
export function getUserTimezone(): string {
  if (typeof window === 'undefined') {
    return DEFAULT_TIMEZONE;
  }

  try {
    const saved = localStorage.getItem('tolee_user_timezone');
    if (saved && isValidTimezone(saved)) {
      return saved;
    }

    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (browserTz && isValidTimezone(browserTz)) {
      return browserTz;
    }
  } catch (e) {
    console.warn('[chatTime] Error detecting timezone, using fallback:', e);
  }

  return DEFAULT_TIMEZONE;
}

/**
 * Validates whether a given string is a recognized IANA timezone identifier.
 */
export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Saves user timezone preference and notifies listeners across the application.
 */
export function setUserTimezone(tz: string): void {
  if (typeof window === 'undefined') return;
  if (!isValidTimezone(tz)) {
    console.error('[chatTime] Invalid timezone passed to setUserTimezone:', tz);
    return;
  }
  localStorage.setItem('tolee_user_timezone', tz);
  window.dispatchEvent(new CustomEvent('tolee_timezone_changed', { detail: { timezone: tz } }));
}

/**
 * Safely parses any date input (ISO string, timestamp number, Date object).
 * Returns null if input is invalid or cannot be parsed.
 */
export function parseDate(dateVal?: Date | string | number | null): Date | null {
  if (!dateVal) return null;
  if (dateVal instanceof Date) {
    return isNaN(dateVal.getTime()) ? null : dateVal;
  }
  const parsed = new Date(dateVal);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Formats a message timestamp in 12-hour format with AM/PM (e.g. "01:13 PM").
 * Converted to the viewer's target IANA timezone.
 */
export function formatMessageTime(
  dateVal?: Date | string | number | null,
  timeZone?: string
): string {
  const d = parseDate(dateVal);
  if (!d) return '';

  const tz = timeZone || getUserTimezone();

  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: tz
    }).format(d);
  } catch (e) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  }
}

/**
 * Generates a stable calendar date key (YYYY-MM-DD) in the target timezone.
 * Used to group messages by date separators accurately according to viewer's local day boundaries.
 */
export function getDateKeyInTimezone(
  dateVal?: Date | string | number | null,
  timeZone?: string
): string {
  const d = parseDate(dateVal);
  if (!d) return 'unknown';

  const tz = timeZone || getUserTimezone();

  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: tz
    }).formatToParts(d);

    const year = parts.find(p => p.type === 'year')?.value || '1970';
    const month = parts.find(p => p.type === 'month')?.value || '01';
    const day = parts.find(p => p.type === 'day')?.value || '01';
    return `${year}-${month}-${day}`;
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

/**
 * WhatsApp-style date separator string:
 * - "Today"
 * - "Yesterday"
 * - "July 29, 2026" (or Month Day, Year)
 */
export function formatMessageDateSeparator(
  dateVal?: Date | string | number | null,
  timeZone?: string
): string {
  const d = parseDate(dateVal);
  if (!d) return '';

  const tz = timeZone || getUserTimezone();
  const now = new Date();

  const msgKey = getDateKeyInTimezone(d, tz);
  const todayKey = getDateKeyInTimezone(now, tz);

  if (msgKey === todayKey) {
    return 'Today';
  }

  // Compute yesterday in target timezone
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayKey = getDateKeyInTimezone(yesterday, tz);

  if (msgKey === yesterdayKey) {
    return 'Yesterday';
  }

  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: tz
    }).format(d);
  } catch {
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }
}

/**
 * WhatsApp-style chat list timestamp (for sidebar/inbox):
 * - Today: "01:13 PM"
 * - Yesterday: "Yesterday"
 * - Within past 6 days: Day name ("Monday", "Tuesday", etc.)
 * - Older: "DD/MM/YYYY" (e.g. "29/07/2026")
 */
export function formatChatListTime(
  dateVal?: Date | string | number | null,
  timeZone?: string
): string {
  const d = parseDate(dateVal);
  if (!d) return '';

  const tz = timeZone || getUserTimezone();
  const now = new Date();

  const msgKey = getDateKeyInTimezone(d, tz);
  const todayKey = getDateKeyInTimezone(now, tz);

  if (msgKey === todayKey) {
    return formatMessageTime(d, tz);
  }

  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayKey = getDateKeyInTimezone(yesterday, tz);

  if (msgKey === yesterdayKey) {
    return 'Yesterday';
  }

  const diffDays = Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays >= 1 && diffDays < 7) {
    try {
      return new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: tz }).format(d);
    } catch {
      return d.toLocaleDateString('en-US', { weekday: 'long' });
    }
  }

  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: tz
    }).format(d);
  } catch {
    return d.toLocaleDateString('en-GB');
  }
}

/**
 * Checks if a user is online based on explicit flag and lastActiveAt grace period (45s).
 */
export function isUserOnline(
  lastActiveAt?: Date | string | number | null,
  isOnlineFlag?: boolean,
  showActivityStatus = true
): boolean {
  if (showActivityStatus === false) return false;
  if (isOnlineFlag === true) return true;
  const d = parseDate(lastActiveAt);
  if (!d) return false;

  // 45 seconds grace threshold
  return (Date.now() - d.getTime()) < 45000;
}

/**
 * WhatsApp-Style Last Seen display format:
 * - Online: "Online"
 * - Today: "Last seen today at 06:42 PM"
 * - Yesterday: "Last seen yesterday at 10:15 AM"
 * - Older (same year): "Last seen on July 29 at 01:13 PM"
 * - Previous year: "Last seen on July 29, 2025 at 01:13 PM"
 */
export function formatLastSeen(
  dateVal?: Date | string | number | null,
  isOnline = false,
  showActivityStatus = true,
  timeZone?: string
): string {
  if (showActivityStatus === false) return '';
  if (isOnline) return 'Online';

  const d = parseDate(dateVal);
  if (!d) return '';

  const tz = timeZone || getUserTimezone();
  const now = new Date();

  const timeStr = formatMessageTime(d, tz);
  const msgKey = getDateKeyInTimezone(d, tz);
  const todayKey = getDateKeyInTimezone(now, tz);

  if (msgKey === todayKey) {
    return `Last seen today at ${timeStr}`;
  }

  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayKey = getDateKeyInTimezone(yesterday, tz);

  if (msgKey === yesterdayKey) {
    return `Last seen yesterday at ${timeStr}`;
  }

  try {
    const dYear = new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: tz }).format(d);
    const nowYear = new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: tz }).format(now);

    const monthDay = new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      timeZone: tz
    }).format(d);

    if (dYear === nowYear) {
      return `Last seen on ${monthDay} at ${timeStr}`;
    }

    return `Last seen on ${monthDay}, ${dYear} at ${timeStr}`;
  } catch {
    return `Last seen on ${d.toLocaleDateString()} at ${timeStr}`;
  }
}
