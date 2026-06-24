import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { formatDisplayName } from '../../utils/formatName';
import { LIBRARY_LOGO_UPDATED_EVENT } from '../../lib/auth';
import { fetchLibraryProfile } from '../api/libraryApi';
import { AdminNotificationPanel, type NotificationFeedItem } from './AdminNotificationPanel';

type AdminDashboardHeaderProps = {
  todayLabel: string;
  unreadCount?: number;
  notificationItems?: NotificationFeedItem[];
  notificationsLoading?: boolean;
  markingAllRead?: boolean;
  onViewAllNotifications?: () => void;
  onNotificationClick?: (item: NotificationFeedItem) => void;
  onMarkAllNotificationsRead?: () => void;
};

export function AdminDashboardHeader({
  todayLabel,
  unreadCount = 0,
  notificationItems = [],
  notificationsLoading,
  markingAllRead,
  onViewAllNotifications,
  onNotificationClick,
  onMarkAllNotificationsRead,
}: AdminDashboardHeaderProps) {
  const { user } = useAuth();
  const name = formatDisplayName(user?.name || user?.username || 'Library Admin');
  const initial = name.charAt(0).toUpperCase();
  const [profileImage, setProfileImage] = useState<string | null>(
    user?.logoUrl ?? user?.library?.logoUrl ?? null
  );
  const [panelOpen, setPanelOpen] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let alive = true;
    fetchLibraryProfile()
      .then((res) => {
        if (!alive) return;
        const url = res.profile?.logoUrl;
        if (typeof url === 'string' && url.trim()) setProfileImage(url);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const onLogoUpdated = (event: Event) => {
      const url = (event as CustomEvent<{ logoUrl?: string }>).detail?.logoUrl;
      if (typeof url === 'string' && url.trim()) setProfileImage(url);
    };
    window.addEventListener(LIBRARY_LOGO_UPDATED_EVENT, onLogoUpdated);
    return () => window.removeEventListener(LIBRARY_LOGO_UPDATED_EVENT, onLogoUpdated);
  }, []);

  return (
    <header className={`admin-dashboard-header admin-card relative mb-6 rounded-2xl p-4 sm:p-5 ${panelOpen ? 'z-[60]' : ''}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-200/90">SmartLibDesk</p>
          <h1 className="font-display mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">
            👋 Welcome back, <span className="text-emerald-200">{name}</span>
          </h1>
          <p className="mt-1 text-sm text-white/70">Here&apos;s what&apos;s happening in your library today.</p>
          <p className="mt-2 inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-emerald-100 ring-1 ring-white/15">
            📅 {todayLabel}
          </p>
        </div>

        <div className="relative flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            ref={bellRef}
            type="button"
            onClick={() => setPanelOpen((v) => !v)}
            className={`relative flex h-10 w-10 items-center justify-center rounded-xl border text-lg shadow-sm transition ${
              panelOpen
                ? 'border-white/30 bg-white/15 text-white'
                : 'border-white/15 bg-white/10 text-white hover:bg-white/15'
            }`}
            aria-label="Open notifications"
            aria-expanded={panelOpen}
          >
            🔔
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : null}
          </button>

          <AdminNotificationPanel
            open={panelOpen}
            items={notificationItems}
            unreadCount={unreadCount}
            loading={notificationsLoading}
            anchorRef={bellRef}
            markingAll={markingAllRead}
            onClose={() => setPanelOpen(false)}
            onViewAll={onViewAllNotifications}
            onItemClick={onNotificationClick}
            onMarkAllRead={onMarkAllNotificationsRead}
          />

          <Link
            to="/admin/settings"
            className="flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/10 py-1.5 pl-1.5 pr-3 shadow-sm transition hover:bg-white/15"
          >
            <span className="flex h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/20 bg-white/12 ring-2 ring-white/10">
              {profileImage ? (
                <img key={profileImage} src={profileImage} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-sm font-bold text-white">
                  {initial}
                </span>
              )}
            </span>
            <span className="hidden text-sm font-semibold text-white sm:inline">Profile</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
