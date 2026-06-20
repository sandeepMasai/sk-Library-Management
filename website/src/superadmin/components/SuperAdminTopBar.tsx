import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchSuperAdminNotifications } from '../api/superadminApi';

export function SuperAdminTopBar() {
  const { user } = useAuth();
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    fetchSuperAdminNotifications(30)
      .then((rows) => setNotificationCount(rows.length))
      .catch(() => setNotificationCount(0));
  }, []);

  return (
    <header className="sticky top-0 z-20 hidden border-b border-white/10 bg-emerald-800/80 backdrop-blur-md lg:block">
      <div className="flex items-center gap-4 px-6 py-3.5">
        <div className="relative min-w-0 flex-1 max-w-xl">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50">🔍</span>
          <input
            type="search"
            placeholder="Search libraries, plans, payments…"
            className="focus-ring-brand w-full rounded-xl border border-white/15 bg-white/10 py-2.5 pl-10 pr-16 text-sm text-white placeholder:text-white/40"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-white/15 bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/50 sm:inline">
            ⌘K
          </kbd>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            to="/superadmin/notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white transition hover:bg-white/15"
            aria-label="Notifications"
          >
            🔔
            {notificationCount > 0 ? (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-400 ring-2 ring-emerald-800" />
            ) : null}
          </Link>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white transition hover:bg-white/15"
            aria-label="Help"
          >
            ?
          </button>
          <div className="ml-1 flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/10 py-1.5 pl-1.5 pr-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm font-bold text-emerald-800">
              {(user?.name || user?.username || 'A').charAt(0).toUpperCase()}
            </span>
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-semibold text-white">{user?.name || 'Super Admin'}</p>
              <p className="text-[11px] text-white/60">Platform Admin</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
