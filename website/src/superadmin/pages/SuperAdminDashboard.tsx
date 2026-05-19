import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchRecentLibraries,
  fetchSubscriptionOverview,
  fetchSuperAdminDashboard,
  type SuperAdminLibrary,
  type SuperAdminStats,
} from '../api/superadminApi';

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function SuperAdminDashboard() {
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [overview, setOverview] = useState({ active: 0, expiringSoon: 0, expired: 0, cancelled: 0 });
  const [recent, setRecent] = useState<SuperAdminLibrary[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchSuperAdminDashboard(), fetchSubscriptionOverview(), fetchRecentLibraries(6)])
      .then(([s, o, libs]) => {
        setStats(s);
        setOverview(o);
        setRecent(libs);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="p-8 text-muted">Loading…</p>;

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-bold text-slate-900">Operations dashboard</h1>
      <p className="mt-1 text-sm text-muted">Platform-wide overview</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total libraries" value={stats.totalLibraries} />
        <StatCard label="Active libraries" value={stats.activeLibraries} />
        <StatCard label="Total students" value={stats.totalStudents} />
        <StatCard
          label="Revenue (₹)"
          value={stats.revenue.toLocaleString('en-IN')}
          hint="Paid library subscriptions"
        />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">Subscriptions</h2>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted">Active</dt>
              <dd className="text-xl font-bold text-emerald-700">{overview.active}</dd>
            </div>
            <div>
              <dt className="text-muted">Expiring soon</dt>
              <dd className="text-xl font-bold text-amber-700">{overview.expiringSoon}</dd>
            </div>
            <div>
              <dt className="text-muted">Expired</dt>
              <dd className="text-xl font-bold text-slate-700">{overview.expired}</dd>
            </div>
            <div>
              <dt className="text-muted">Cancelled</dt>
              <dd className="text-xl font-bold text-red-700">{overview.cancelled}</dd>
            </div>
          </dl>
          <Link to="/superadmin/subscriptions" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
            View subscriptions →
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">New libraries</h2>
          {recent.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No recent libraries.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {recent.map((lib) => (
                <li key={lib.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-slate-900">{lib.name}</span>
                  <span className="shrink-0 text-xs text-muted">{lib.planName || lib.city || ''}</span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/superadmin/libraries" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
            All libraries →
          </Link>
        </div>
      </div>
    </div>
  );
}
