import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import type { LibraryNotification } from '../api/libraryApi';
import {
  isLibraryIncomingNotification,
  isLibraryIncomingUnread,
} from '../utils/notificationHelpers';

export type NotificationFeedItem = {
  id: string;
  title: string;
  message?: string;
  time?: string;
  icon?: string;
  unread?: boolean;
  kind?: 'incoming' | 'sent' | 'alert';
  canMarkRead?: boolean;
};

type PanelPosition = {
  top: number;
  left: number;
  width: number;
};

type AdminNotificationPanelProps = {
  open: boolean;
  items: NotificationFeedItem[];
  unreadCount?: number;
  loading?: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onViewAll?: () => void;
  onItemClick?: (item: NotificationFeedItem) => void;
  onMarkAllRead?: () => void;
  markingAll?: boolean;
};

function usePanelPosition(anchorRef: RefObject<HTMLElement | null>, open: boolean) {
  const [position, setPosition] = useState<PanelPosition | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }

    const update = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      const gutter = 12;
      const panelWidth = Math.min(380, window.innerWidth - gutter * 2);
      const left = Math.min(
        Math.max(gutter, rect.right - panelWidth),
        window.innerWidth - panelWidth - gutter
      );
      const top = rect.bottom + 8;

      setPosition({ top, left, width: panelWidth });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [anchorRef, open]);

  return position;
}

function itemClassName(item: NotificationFeedItem) {
  if (item.unread) {
    return 'border-red-300/50 bg-red-500/15 hover:bg-red-500/20';
  }
  if (item.kind === 'alert') {
    return 'border-amber-300/50 bg-amber-500/10 hover:bg-amber-500/15';
  }
  return 'border-white/15 bg-white/10 hover:bg-white/15';
}

export function AdminNotificationPanel({
  open,
  items,
  unreadCount = 0,
  loading,
  anchorRef,
  onClose,
  onViewAll,
  onItemClick,
  onMarkAllRead,
  markingAll,
}: AdminNotificationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const position = usePanelPosition(anchorRef, open);

  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }

    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    }

    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [anchorRef, onClose, open]);

  if (!open || !position) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[200] bg-slate-900/25 backdrop-blur-[1px] lg:bg-transparent lg:backdrop-blur-none"
        aria-hidden
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="admin-notification-panel admin-card fixed z-[210] flex max-h-[min(36rem,calc(100dvh-4rem))] flex-col overflow-hidden rounded-2xl shadow-2xl"
        style={{
          top: position.top,
          left: position.left,
          width: position.width,
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Inbox</p>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-base font-bold text-white">Notifications</h2>
              {unreadCount > 0 ? (
                <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount} new
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && onMarkAllRead ? (
              <button
                type="button"
                onClick={onMarkAllRead}
                disabled={markingAll}
                className="rounded-lg px-2 py-1.5 text-xs font-semibold text-rose-300 hover:bg-white/10 disabled:opacity-50"
              >
                {markingAll ? '…' : 'Mark all read'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-white/70 hover:bg-white/10"
              aria-label="Close notifications"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="admin-skeleton h-16 rounded-xl" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <span className="text-3xl">🔔</span>
              <p className="mt-2 text-sm font-medium text-white">No notifications</p>
              <p className="mt-1 text-xs text-white/60">You&apos;re all caught up.</p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onItemClick?.(item)}
                    className={`flex w-full gap-3 rounded-xl px-3 py-3 text-left transition ${itemClassName(item)} ${
                      item.canMarkRead ? 'cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    {item.unread ? <span className="w-1 shrink-0 self-stretch rounded-full bg-red-500" /> : null}
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base ${
                        item.unread ? 'bg-red-500/20' : item.kind === 'alert' ? 'bg-amber-500/20' : 'bg-white/10'
                      }`}
                    >
                      {item.icon || '🔔'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-sm font-semibold ${
                            item.unread ? 'text-rose-200' : 'text-white'
                          }`}
                        >
                          {item.title}
                        </p>
                        {item.unread ? (
                          <span className="shrink-0 rounded-md bg-red-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                            New
                          </span>
                        ) : null}
                      </div>
                      {item.message ? (
                        <p className="mt-0.5 line-clamp-2 text-xs text-white/70">{item.message}</p>
                      ) : null}
                      {item.time ? <p className="mt-1 text-[11px] text-white/50">{item.time}</p> : null}
                      {item.kind === 'incoming' ? (
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-rose-300/80">
                          From platform admin
                        </p>
                      ) : item.kind === 'sent' ? (
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-teal-300/80">
                          Sent to students
                        </p>
                      ) : null}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="shrink-0 border-t border-white/10 p-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              onViewAll?.();
            }}
            className="w-full rounded-xl border border-white/15 bg-white/10 py-2.5 text-center text-sm font-semibold text-teal-300 transition hover:bg-white/15"
          >
            View all on dashboard
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

function formatNotificationTime(date?: string) {
  if (!date) return undefined;
  return new Date(date).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function buildNotificationFeedItems(
  notifications: LibraryNotification[],
  extras: NotificationFeedItem[] = []
): NotificationFeedItem[] {
  const fromApi = notifications.map((note) => {
    const incoming = isLibraryIncomingNotification(note);
    const isNew = isLibraryIncomingUnread(note);
    return {
      id: note.id,
      title: note.title,
      message: note.message,
      time: formatNotificationTime(note.date),
      icon: incoming ? '📣' : '📤',
      unread: isNew,
      kind: incoming ? ('incoming' as const) : ('sent' as const),
      canMarkRead: isNew,
    };
  });

  fromApi.sort((a, b) => {
    if (a.unread !== b.unread) return a.unread ? -1 : 1;
    return 0;
  });

  const alerts = extras.map((item) => ({
    ...item,
    kind: 'alert' as const,
    unread: false,
    canMarkRead: false,
  }));

  return [...fromApi, ...alerts];
}
