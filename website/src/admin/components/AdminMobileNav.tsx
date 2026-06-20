import { NavLink } from 'react-router-dom';
import { DashboardNavIcon } from '../../components/dashboard/DashboardNavIcon';

const NAV = [
  { to: '/admin', label: 'Home', icon: 'dashboard', end: true },
  { to: '/admin/students', label: 'Students', icon: 'students' },
  { to: '/admin/attendance', label: 'Attendance', icon: 'attendance' },
  { to: '/admin/subscription', label: 'Fees', icon: 'subscription' },
  { to: '/admin/settings', label: 'Settings', icon: 'settings' },
] as const;

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold transition ${
    isActive ? 'text-white' : 'text-white/55'
  }`;

export function AdminMobileNav() {
  return (
    <nav
      className="admin-mobile-nav fixed inset-x-0 bottom-0 z-40 border-t px-2 py-2 backdrop-blur-md safe-bottom lg:hidden"
      aria-label="Mobile navigation"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-between gap-1">
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} className={linkClass} end={item.end}>
            <DashboardNavIcon name={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
