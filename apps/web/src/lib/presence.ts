/**
 * WhatsApp-style Presence & Last Seen Utilities
 * Accurate timezone-aware formatting and presence detection.
 */

export function isUserOnline(
  lastActiveAt?: string | Date | null,
  isOnlineFlag?: boolean,
  showActivityStatus = true
): boolean {
  if (showActivityStatus === false) return false;
  if (isOnlineFlag === true) return true;
  if (!lastActiveAt) return false;

  const date = typeof lastActiveAt === 'string' ? new Date(lastActiveAt) : lastActiveAt;
  if (isNaN(date.getTime())) return false;

  // Grace threshold: 45 seconds
  return (Date.now() - date.getTime()) < 45000;
}

export function formatLastSeen(
  dateVal?: string | Date | null,
  isOnline = false,
  showActivityStatus = true
): string {
  if (showActivityStatus === false) return '';
  if (isOnline) return 'Online';
  if (!dateVal) return '';

  const date = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
  if (isNaN(date.getTime())) return '';

  const now = new Date();

  // Local user time string with AM/PM (e.g. "07:36 PM")
  const timeStr = date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return `Last seen ${timeStr}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return `Last seen yesterday at ${timeStr}`;
  }

  const isSameYear = date.getFullYear() === now.getFullYear();
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleDateString('en-US', { month: 'short' });

  if (isSameYear) {
    return `Last seen ${day} ${month} at ${timeStr}`;
  }

  return `Last seen ${day} ${month} ${date.getFullYear()} at ${timeStr}`;
}
