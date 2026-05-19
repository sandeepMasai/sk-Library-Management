import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchDashboard, type DashboardData } from '../api/libraryApi';

function StatCard({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className={`rounded-2xl border bg-white p-6 shadow-sm ${tone || 'border-slate-200'}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

export function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="p-8 text-muted">Loading dashboard…</p>;
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {error.includes('subscription') || error.includes('403') ? (
            <>
              Subscription required.{' '}
              <Link to="/admin/subscription" className="font-semibold underline">
                Activate a plan
              </Link>
            </>
          ) : (
            error
          )}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="page-pad">
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
      <p className="mt-1 text-sm text-muted">Overview for {data.attendance?.date || 'today'}</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total students" value={data.students.total} />
        <StatCard label="Active" value={data.students.active} tone="border-emerald-200" />
        <StatCard label="Fee due" value={data.payments.feeDueCount} tone="border-amber-200" />
        <StatCard label="Today's attendance" value={`${data.attendance.todayCount} (${data.attendance.attendancePct}%)`} />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">Payments summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Collected</dt>
              <dd className="font-semibold">₹{data.payments.collectedAmount.toLocaleString('en-IN')}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Due</dt>
              <dd className="font-semibold text-amber-700">₹{data.payments.dueAmount.toLocaleString('en-IN')}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Pending renewals</dt>
              <dd className="font-semibold">{data.renewalRequests?.pending ?? 0}</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">Quick actions</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/admin/students" className="rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              Manage students
            </Link>
            <Link to="/admin/attendance" className="rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              Attendance QR
            </Link>
            <Link to="/admin/seats" className="rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              Seats
            </Link>
            <Link to="/admin/subscription" className="rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              Subscription
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
