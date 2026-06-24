import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { DashboardNavIcon } from '../components/dashboard/DashboardNavIcon';
import { Logo } from '../components/Logo';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { fetchSuperAdminNotifications } from './api/superadminApi';

const NAV = [
  { to: '/superadmin/dashboard', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/superadmin/libraries', label: 'Libraries', icon: 'libraries' },
  { to: '/superadmin/plans', label: 'Plans', icon: 'plans' },
  { to: '/superadmin/subscriptions', label: 'Subscriptions', icon: 'subscriptions' },
  { to: '/superadmin/payments', label: 'Payment Details', icon: 'payments' },
  { to: '/superadmin/students', label: 'Students', icon: 'students' },
  { to: '/superadmin/notifications', label: 'Library Messages', icon: 'notifications' },
] as const;

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
    isActive
      ? 'bg-white/15 text-white shadow-sm ring-1 ring-white/20'
      : 'text-white/70 hover:bg-white/10 hover:text-white'
  }`;

type SuperAdminSidebarProps = {
  onNavigate?: () => void;
};

export function SuperAdminSidebar({ onNavigate }: SuperAdminSidebarProps) {
  const { user, logout } = useAuth();
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    fetchSuperAdminNotifications(30)
      .then((rows) => setNotificationCount(rows.length))
      .catch(() => setNotificationCount(0));
  }, []);

  return (
    <aside className="superadmin-sidebar flex h-[100dvh] w-full flex-col overflow-hidden border-r border-white/10 bg-emerald-800 lg:w-[17rem]">
      <div className="shrink-0 border-b border-white/10 p-5">
        <Logo size="sm" variant="light" linkToHome={false} />
        <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-emerald-200/90">Enterprise Admin</p>
        <p className="mt-1 truncate text-sm font-medium text-white">{user?.username || user?.name || 'Super Admin'}</p>
      </div>

      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-3">
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} className={linkClass} end={item.end} onClick={onNavigate}>
            <DashboardNavIcon name={item.icon} />
            <span className="flex-1">{item.label}</span>
            {item.icon === 'notifications' && notificationCount > 0 ? (
              <span className="rounded-full bg-red-400/90 px-2 py-0.5 text-[10px] font-bold text-emerald-950">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            ) : null}
          </NavLink>
        ))}
      </nav>

      <div className="mx-3 mb-3 shrink-0 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200">Enterprise Edition</p>
        <p className="mt-1 text-sm font-medium text-white">Plan Management System</p>
        <NavLink to="/superadmin/plans" onClick={onNavigate} className="mt-3 block">
          <Button fullWidth size="sm" className="!from-white !to-emerald-50 !text-emerald-800 hover:!brightness-105">
            Open Plans
          </Button>
        </NavLink>
      </div>

      <div className="shrink-0 border-t border-white/10 p-4">
        <NavLink
          to="/"
          className="mb-2 block text-xs text-white/60 transition hover:text-white"
          onClick={onNavigate}
        >
          ← Marketing site
        </NavLink>
        <button
          type="button"
          onClick={logout}
          className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
