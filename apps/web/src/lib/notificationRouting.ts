/**
 * Centralized Notification Deep-Linking & Routing Helper
 * Resolves push notification data payloads and DB notification records
 * to the exact target URL with target ID parameters (message, post, comment, reply).
 */

export interface NotificationPayloadData {
  url?: string;
  link?: string;
  type?: string;
  target_type?: string;
  target_id?: string;
  chat_id?: string;
  chatId?: string;
  group_id?: string;
  groupId?: string;
  tolee_id?: string;
  toleeId?: string;
  message_id?: string;
  messageId?: string;
  msgId?: string;
  post_id?: string;
  postId?: string;
  comment_id?: string;
  commentId?: string;
  reply_id?: string;
  replyId?: string;
  user_id?: string;
  userId?: string;
  [key: string]: any;
}

const PENDING_NOTIFICATION_STORAGE_KEY = 'tolee_pending_notification_url';

/**
 * Resolves a push notification or in-app notification data object to an authoritative internal URL.
 */
export function getNotificationNavigationUrl(data?: NotificationPayloadData | null): string {
  if (!data) return '/';

  // 1. If explicit URL is already present and well-formed
  const rawUrl = data.url || data.link;
  if (rawUrl && typeof rawUrl === 'string' && rawUrl.trim() !== '') {
    // If it's already a relative path with parameters, return as-is
    if (rawUrl.startsWith('/')) {
      return rawUrl;
    }
    // If full domain URL (e.g., https://tolee.in/chat?chatId=...), extract relative path
    try {
      const parsed = new URL(rawUrl, 'https://tolee.in');
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
    }
  }

  const type = (data.type || data.target_type || '').toLowerCase();

  // 2. Chat Message Deep Linking (Group & 1-to-1)
  if (type === 'chat' || data.target_type === 'message' || data.message_id || data.msgId) {
    const chatId = data.chat_id || data.chatId || data.group_id || data.groupId || '';
    const msgId = data.message_id || data.messageId || data.msgId || data.target_id || '';
    const toleeId = data.tolee_id || data.toleeId || '';
    const userId = data.user_id || data.userId || '';

    const params = new URLSearchParams();
    if (chatId) params.set('chatId', chatId);
    else if (toleeId) params.set('toleeId', toleeId);
    else if (userId) params.set('userId', userId);

    if (msgId) params.set('msgId', msgId);

    const queryString = params.toString();
    return queryString ? `/chat?${queryString}` : '/chat';
  }

  // 3. Comment / Reply Deep Linking
  if (type === 'comment' || type === 'reply' || data.target_type === 'comment' || data.target_type === 'reply') {
    const postId = data.post_id || data.postId || data.target_id || '';
    const commentId = data.comment_id || data.commentId || '';
    const replyId = data.reply_id || data.replyId || '';

    if (postId) {
      const params = new URLSearchParams();
      if (commentId) params.set('commentId', commentId);
      if (replyId) params.set('replyId', replyId);
      const qs = params.toString();
      return qs ? `/post/${postId}?${qs}` : `/post/${postId}`;
    }
  }

  // 4. Like Notification Deep Linking
  if (type === 'like' || data.target_type === 'post') {
    const postId = data.post_id || data.postId || data.target_id || '';
    if (postId) {
      return `/post/${postId}?highlight=like`;
    }
  }

  // 5. Follow Notifications
  if (type === 'follow' || type === 'follow_approval') {
    const username = data.username || data.actor_username;
    if (username) return `/u/${username}`;
  }

  // 6. Radar Notifications
  if (type.startsWith('radar')) {
    const radarId = data.radar_id || data.target_id;
    if (radarId) return `/radar/${radarId}`;
    return '/radar';
  }

  // 7. Fallback to notifications list
  return '/notifications';
}

/**
 * Saves a pending notification target URL in sessionStorage for cold starts or unauthenticated redirects.
 */
export function savePendingNotificationUrl(url: string) {
  if (typeof window === 'undefined' || !url) return;
  try {
    sessionStorage.setItem(PENDING_NOTIFICATION_STORAGE_KEY, url);
  } catch (err) {
    console.warn('[NotificationRouting] Unable to save pending URL:', err);
  }
}

/**
 * Retrieves and clears any pending notification URL once handled.
 */
export function getAndClearPendingNotificationUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const url = sessionStorage.getItem(PENDING_NOTIFICATION_STORAGE_KEY);
    if (url) {
      sessionStorage.removeItem(PENDING_NOTIFICATION_STORAGE_KEY);
      return url;
    }
  } catch (err) {
    console.warn('[NotificationRouting] Unable to read pending URL:', err);
  }
  return null;
}
