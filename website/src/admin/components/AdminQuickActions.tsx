import { Link } from 'react-router-dom';

const ACTIONS = [
  { to: '/admin/students', label: 'Add Student', icon: '👨‍🎓', tone: 'violet' },
  { to: '/admin/attendance', label: 'Attendance', icon: '📅', tone: 'blue' },
  { to: '/admin/students', label: 'Collect Fee', icon: '💰', tone: 'emerald' },
  { to: '/admin/communications', label: 'Send Message', icon: '💬', tone: 'cyan' },
  { to: '/admin/seats', label: 'Add Seat', icon: '🪑', tone: 'amber' },
  { to: '/admin/students', label: 'Reports', icon: '📊', tone: 'rose' },
] as const;

export function AdminQuickActions() {
  return (
    <section className="admin-panel admin-card rounded-2xl p-4 sm:p-5">
      <h2 className="font-display text-base font-bold text-white">Quick Actions</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {ACTIONS.map((action) => (
          <Link
            key={action.label}
            to={action.to}
            className="admin-quick-action flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-3 py-4 text-center text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/15 hover:shadow-md"
          >
            <span className="text-2xl" aria-hidden>
              {action.icon}
            </span>
            <span>{action.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
