import { useEffect, useState } from 'react';
import { formatDisplayName } from '../utils/formatName';
import { NavLink } from 'react-router-dom';
import { DashboardNavIcon } from '../components/dashboard/DashboardNavIcon';
import { Logo } from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { fetchSubscriptionMe } from './api/libraryApi';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/admin/students', label: 'Students', icon: 'students' },
  { to: '/admin/attendance', label: 'Attendance', icon: 'attendance' },
  { to: '/admin/seats', label: 'Seats', icon: 'seats' },
  { to: '/admin/subscription', label: 'Subscription', icon: 'subscription' },
  { to: '/admin/settings', label: 'Settings', icon: 'settings' },
] as const;

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
    isActive
      ? 'bg-white/15 text-white shadow-sm ring-1 ring-white/20'
      : 'text-white/70 hover:bg-white/10 hover:text-white'
  }`;

type AdminSidebarProps = {
  onNavigate?: () => void;
};

export function AdminSidebar({ onNavigate }: AdminSidebarProps) {
  const { user, logout } = useAuth();
  const [planLabel, setPlanLabel] = useState('Library plan');
  const [expiryLabel, setExpiryLabel] = useState('');

  useEffect(() => {
    fetchSubscriptionMe()
      .then((sub) => {
        const key = String(sub.currentPlanKey || sub.plan || 'plan').replace(/_/g, ' ');
        setPlanLabel(key.charAt(0).toUpperCase() + key.slice(1));
        if (sub.planExpiryDate) {
          setExpiryLabel(
            new Date(sub.planExpiryDate).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
          );
        }
      })
      .catch(() => {});
  }, []);

  return (
    <aside className="admin-sidebar flex h-[100dvh] w-full flex-col overflow-hidden border-r lg:w-[17rem]">
      <div className="shrink-0 border-b border-white/10 p-5">
        <Logo size="sm" variant="light" linkToHome={false} />
        <p className="mt-3 truncate text-xs font-semibold uppercase tracking-wider text-emerald-200/90">
          Library Admin
        </p>
        <p className="mt-1 truncate text-sm font-semibold text-white">{formatDisplayName(user?.name)}</p>
        <p className="text-xs text-white/60">Library Admin</p>
        {user?.libraryCode ? (
          <p className="mt-2 inline-block rounded-lg bg-white/10 px-2 py-1 font-mono text-xs text-emerald-100 ring-1 ring-white/15">
            {user.libraryCode}
          </p>
        ) : null}
      </div>

      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-3">
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} className={linkClass} end={item.end} onClick={onNavigate}>
            <DashboardNavIcon name={item.icon} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mx-3 mb-3 shrink-0 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200">Premium plan</p>
        <p className="mt-1 text-sm font-bold text-white">{planLabel}</p>
        {expiryLabel ? <p className="mt-1 text-xs text-white/60">Valid till {expiryLabel}</p> : null}
        <NavLink
          to="/admin/subscription"
          onClick={onNavigate}
          className="mt-3 block rounded-xl bg-white px-3 py-2 text-center text-xs font-semibold text-emerald-800 shadow-sm transition hover:brightness-105"
        >
          View plan
        </NavLink>
      </div>

      <div className="shrink-0 border-t border-white/10 p-4">
        <NavLink
          to="/"
          className="mb-2 block text-xs text-white/55 transition hover:text-emerald-200"
          onClick={onNavigate}
        >
          ← Marketing site
        </NavLink>
        <button
          type="button"
          onClick={logout}
          className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
