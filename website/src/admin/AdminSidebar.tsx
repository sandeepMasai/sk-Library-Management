import { NavLink } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/students', label: 'Students' },
  { to: '/admin/attendance', label: 'Attendance' },
  { to: '/admin/seats', label: 'Seats' },
  { to: '/admin/subscription', label: 'Subscription' },
  { to: '/admin/settings', label: 'Settings' },
] as const;

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
    isActive ? 'bg-white/15 text-white' : 'text-teal-100/80 hover:bg-white/10 hover:text-white'
  }`;

export function AdminSidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="flex w-64 shrink-0 flex-col bg-gradient-to-b from-[#0b3d36] to-primary text-white">
      <div className="border-b border-white/10 p-5">
        <Logo size="sm" variant="light" />
        <p className="mt-3 truncate text-xs text-teal-100/70">{user?.name}</p>
        {user?.libraryCode ? (
          <p className="mt-2 inline-block rounded-lg bg-white/10 px-2 py-1 text-xs font-mono">{user.libraryCode}</p>
        ) : null}
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} className={linkClass} end={item.end}>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 p-4">
        <NavLink to="/" className="mb-2 block text-xs text-teal-100/70 hover:text-white">
          ← Marketing site
        </NavLink>
        <button
          type="button"
          onClick={logout}
          className="w-full rounded-xl border border-white/20 px-4 py-2.5 text-sm font-medium hover:bg-white/10"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
