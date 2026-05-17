import type { Notification } from '../store';

/** Whether a notification is unread for the current student (tab badge + list red styling). */
export function isNotificationUnread(
  n: Notification,
  studentId: string,
  lastNotifSeenAt?: string | null
): boolean {
  if (n.id.startsWith('sys-')) return false;
  if (!(n.targetId === 'all' || n.targetId === studentId)) return false;

  // Server sends readByMe for each row — only explicit false is unread.
  if (n.readByMe === true) return false;
  if (n.readByMe === false) return true;

  // Legacy rows without readByMe (rare): fall back to last-seen timestamp.
  const cutoff = lastNotifSeenAt ? new Date(lastNotifSeenAt).getTime() : 0;
  return new Date(n.date).getTime() > cutoff;
}

/** Super-admin → library inbox item (not a broadcast the library sent to students). */
export function isLibraryIncomingNotification(n: Notification): boolean {
  return n.targetType === 'library';
}

/** Unread inbox item for library staff — only these should use red / NEW styling. */
export function isLibraryIncomingUnread(n: Notification): boolean {
  return isLibraryIncomingNotification(n) && n.readByMe !== true;
}
