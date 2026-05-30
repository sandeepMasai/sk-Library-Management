import { NavLink } from 'react-router-dom';
import { DashboardNavIcon } from '../components/dashboard/DashboardNavIcon';
import { Logo } from '../components/Logo';
import { useAuth } from '../context/AuthContext';

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
      ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/15'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`;

type AdminSidebarProps = {
  onNavigate?: () => void;
};

export function AdminSidebar({ onNavigate }: AdminSidebarProps) {
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-full min-h-screen w-full flex-col border-r border-slate-200/80 bg-white lg:min-h-0 lg:w-[17rem] lg:shrink-0">
      <div className="border-b border-slate-100 p-5">
        <Logo size="sm" />
        <p className="mt-3 truncate text-xs font-semibold uppercase tracking-wider text-muted">Library Admin</p>
        <p className="mt-1 truncate text-sm font-medium text-slate-900">{user?.name}</p>
        {user?.libraryCode ? (
          <p className="mt-2 inline-block rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs text-primary">
            {user.libraryCode}
          </p>
        ) : null}
      </div>
      <nav className="flex-1 space-y-0.5 p-3">
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} className={linkClass} end={item.end} onClick={onNavigate}>
            <DashboardNavIcon name={item.icon} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-100 p-4">
        <NavLink to="/" className="mb-2 block text-xs text-muted transition hover:text-primary" onClick={onNavigate}>
          ← Marketing site
        </NavLink>
        <button
          type="button"
          onClick={logout}
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
