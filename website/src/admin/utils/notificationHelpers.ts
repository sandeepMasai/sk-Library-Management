import type { LibraryNotification } from '../api/libraryApi';

/** Super-admin → library inbox (not a broadcast the library sent to students). */
export function isLibraryIncomingNotification(n: LibraryNotification): boolean {
  return n.targetType === 'library';
}

/** Unread inbox item for library staff — red / NEW styling + bell badge. */
export function isLibraryIncomingUnread(n: LibraryNotification): boolean {
  return isLibraryIncomingNotification(n) && n.readByMe !== true;
}

export function countUnreadIncoming(notifications: LibraryNotification[]): number {
  return notifications.filter(isLibraryIncomingUnread).length;
}
