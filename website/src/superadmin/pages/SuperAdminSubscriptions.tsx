import { useEffect, useState } from 'react';
import { fetchSubscriptionOverview } from '../api/superadminApi';

export function SuperAdminSubscriptions() {
  const [overview, setOverview] = useState({ active: 0, expiringSoon: 0, expired: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSubscriptionOverview()
      .then(setOverview)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-pad">
      <h1 className="text-2xl font-bold text-slate-900">Subscriptions</h1>
      <p className="mt-1 text-sm text-muted">Platform subscription health</p>

      {loading ? <p className="mt-8 text-muted">Loading…</p> : null}
      {error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
      ) : null}

      {!loading && !error ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ['Active', overview.active, 'text-emerald-700'],
              ['Expiring soon', overview.expiringSoon, 'text-amber-700'],
              ['Expired', overview.expired, 'text-slate-700'],
              ['Cancelled', overview.cancelled, 'text-red-700'],
            ] as const
          ).map(([label, value, color]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase text-muted">{label}</p>
              <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      ) : null}

      <p className="mt-8 text-sm text-muted">
        For detailed subscription management, payment plans, and library actions, use the mobile Super Admin app.
      </p>
    </div>
  );
}
