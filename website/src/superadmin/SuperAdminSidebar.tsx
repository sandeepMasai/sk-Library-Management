import { NavLink } from 'react-router-dom';
import { DashboardNavIcon } from '../components/dashboard/DashboardNavIcon';
import { Logo } from '../components/Logo';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/superadmin/dashboard', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/superadmin/libraries', label: 'Libraries', icon: 'libraries' },
  { to: '/superadmin/subscriptions', label: 'Subscriptions', icon: 'subscriptions' },
  { to: '/superadmin/students', label: 'Students', icon: 'students' },
] as const;

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
    isActive
      ? 'bg-cyan-500/15 text-cyan-300 shadow-lg ring-1 ring-cyan-500/25'
      : 'text-slate-400 hover:bg-white/5 hover:text-white'
  }`;

type SuperAdminSidebarProps = {
  onNavigate?: () => void;
};

export function SuperAdminSidebar({ onNavigate }: SuperAdminSidebarProps) {
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-full min-h-screen w-full flex-col border-r border-white/5 bg-[#060d18] text-white lg:min-h-0 lg:w-[17rem] lg:shrink-0">
      <div className="border-b border-white/10 p-5">
        <Logo size="sm" variant="light" linkToHome={false} />
        <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-cyan-400/90">Global Intelligence</p>
        <p className="mt-2 truncate text-xs text-slate-500">{user?.username || user?.name}</p>
      </div>
      <nav className="flex-1 space-y-0.5 p-3">
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} className={linkClass} end={item.end} onClick={onNavigate}>
            <DashboardNavIcon name={item.icon} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 p-4">
        <NavLink to="/" className="mb-2 block text-xs text-slate-500 transition hover:text-white" onClick={onNavigate}>
          ← Marketing site
        </NavLink>
        <button
          type="button"
          onClick={logout}
          className="glass-panel-dark w-full rounded-xl px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/10"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
