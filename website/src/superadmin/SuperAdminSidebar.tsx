import { NavLink } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/superadmin/dashboard', label: 'Dashboard', end: true },
  { to: '/superadmin/libraries', label: 'Libraries' },
  { to: '/superadmin/subscriptions', label: 'Subscriptions' },
  { to: '/superadmin/students', label: 'Students' },
] as const;

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
    isActive ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:bg-white/5 hover:text-white'
  }`;

export function SuperAdminSidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="flex w-64 shrink-0 flex-col bg-[#0B1220] text-white">
      <div className="border-b border-white/10 p-5">
        <Logo size="sm" variant="light" linkToHome={false} />
        <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-emerald-400/90">Super Admin</p>
        <p className="mt-2 truncate text-xs text-slate-400">{user?.username || user?.name}</p>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} className={linkClass} end={item.end}>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 p-4">
        <NavLink to="/" className="mb-2 block text-xs text-slate-500 hover:text-white">
          ← Marketing site
        </NavLink>
        <button
          type="button"
          onClick={logout}
          className="w-full rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
