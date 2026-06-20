import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { DashboardKpiCard } from '../../components/dashboard/DashboardKpiCard';
import { RevenueAreaChart } from '../../components/dashboard/RevenueAreaChart';
import {
  fetchPlanDistribution,
  fetchPlanManagementOverview,
  fetchPlatformTrends,
  fetchRecentActivity,
  fetchRecentLibraries,
  fetchRevenueOverview,
  fetchSuperAdminNotifications,
  fetchSubscriptionOverview,
  fetchSuperAdminDashboard,
  fetchSuperAdminLibraries,
  type PlanDistribution,
  type PlatformTrends,
  type RevenueOverview,
  type SuperAdminActivity,
  type SuperAdminLibrary,
  type SuperAdminNotification,
  type SuperAdminStats,
} from '../api/superadminApi';
import { SaasCard } from '../components/SaasCard';
import { SuperAdminPagination } from '../components/SuperAdminPagination';
import { SuperAdminRightPanel } from '../components/SuperAdminRightPanel';
import { SuperAdminTableScroll } from '../components/SuperAdminTableScroll';

function formatInr(amount: number) {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function formatGrowth(pct: number | undefined): string | undefined {
  if (pct == null || !Number.isFinite(pct)) return undefined;
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct}% vs last month`;
}

function formatRelativeTime(iso?: string | null) {
  if (!iso) return 'Recently';
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff)) return 'Recently';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function statusBadge(status: string, isActive?: boolean) {
  if (!isActive) return 'bg-red-500/20 text-red-200';
  if (status === 'active') return 'bg-emerald-500/20 text-emerald-200';
  if (status === 'cancelled') return 'bg-white/10 text-white/70';
  if (status === 'expired') return 'bg-red-500/20 text-red-200';
  return 'bg-amber-500/20 text-amber-200';
}

function planBadge(key?: string) {
  const k = String(key || '').toLowerCase();
  if (k === 'trial') return 'bg-amber-500/20 text-amber-200';
  if (k === 'yearly' || k === 'premium') return 'bg-emerald-500/20 text-emerald-200';
  return 'bg-white/10 text-white/80';
}

function conicGradient(segments: PlanDistribution['segments']) {
  if (!segments.length) return 'conic-gradient(#94a3b8 0 100%)';
  let cursor = 0;
  const stops = segments.map((seg) => {
    const end = cursor + Math.max(seg.percent, 0);
    const part = `${seg.color} ${cursor}% ${end}%`;
    cursor = end;
    return part;
  });
  return `conic-gradient(${stops.join(', ')})`;
}

const QUICK_ACTIONS = [
  { label: 'Create New Plan', to: '/superadmin/plans', icon: '➕' },
  { label: 'Add Library', to: '/register', icon: '🏛' },
  { label: 'Assign Subscription', to: '/superadmin/libraries', icon: '📋' },
  { label: 'View Subscriptions', to: '/superadmin/subscriptions', icon: '💳' },
  { label: 'Manage Students', to: '/superadmin/students', icon: '👥' },
];

const LIB_PAGE_SIZE = 10;

export function SuperAdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [overview, setOverview] = useState({ active: 0, expiringSoon: 0, expired: 0, cancelled: 0 });
  const [mgmt, setMgmt] = useState({ totalLibraries: 0, activeSubscribers: 0, monthlyRevenue: 0, expiringPlans: 0 });
  const [revenueOverview, setRevenueOverview] = useState<RevenueOverview | null>(null);
  const [trends, setTrends] = useState<PlatformTrends | null>(null);
  const [planDistribution, setPlanDistribution] = useState<PlanDistribution | null>(null);
  const [activities, setActivities] = useState<SuperAdminActivity[]>([]);
  const [notificationRows, setNotificationRows] = useState<SuperAdminNotification[]>([]);
  const [libraries, setLibraries] = useState<SuperAdminLibrary[]>([]);
  const [libTotal, setLibTotal] = useState(0);
  const [libPage, setLibPage] = useState(1);
  const [recent, setRecent] = useState<SuperAdminLibrary[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [libLoading, setLibLoading] = useState(false);

  const libTotalPages = Math.max(1, Math.ceil(libTotal / LIB_PAGE_SIZE));
  const adminName = user?.name || user?.username || 'Super Admin';

  useEffect(() => {
    Promise.all([
      fetchSuperAdminDashboard(),
      fetchSubscriptionOverview(),
      fetchPlanManagementOverview(),
      fetchRecentLibraries(5),
      fetchRevenueOverview(),
      fetchPlatformTrends(),
      fetchPlanDistribution(),
      fetchRecentActivity(12),
      fetchSuperAdminNotifications(5),
    ])
      .then(([s, o, m, rec, rev, platformTrends, distribution, activityRows, sentNotifications]) => {
        setStats(s);
        setOverview(o);
        setMgmt(m);
        setRecent(rec);
        setRevenueOverview(rev);
        setTrends(platformTrends);
        setPlanDistribution(distribution);
        setActivities(activityRows);
        setNotificationRows(sentNotifications);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setLibLoading(true);
    fetchSuperAdminLibraries({ page: libPage, limit: LIB_PAGE_SIZE })
      .then((res) => {
        setLibraries(res.libraries);
        setLibTotal(res.total);
      })
      .catch(() => {
        setLibraries([]);
        setLibTotal(0);
      })
      .finally(() => setLibLoading(false));
  }, [libPage]);

  const notifications = useMemo(
    () =>
      notificationRows.map((row) => ({
        id: row.id,
        title: row.title,
        time: formatRelativeTime(row.createdAt),
        icon: '🔔',
      })),
    [notificationRows]
  );

  const activityFeed = useMemo(
    () =>
      activities.slice(0, 8).map((row) => ({
        id: row.id,
        title: row.description || row.title,
        time: formatRelativeTime(row.timestamp),
      })),
    [activities]
  );

  if (loading) return <p className="page-pad text-white/65">Loading dashboard…</p>;

  if (error) {
    return (
      <div className="page-pad">
        <SaasCard error>
          <p className="text-sm text-red-200">{error}</p>
        </SaasCard>
      </div>
    );
  }

  if (!stats || !revenueOverview || !trends || !planDistribution) return null;

  const libraryBars = trends.newLibraries.sparkline.map((p) => p.value);
  const subscriptionBars = trends.subscriptionGrowth.sparkline.map((p) => p.value);
  const expiryBars = trends.expiryTrend.sparkline.map((p) => p.value);

  return (
    <div className="page-pad">
      <div className="flex flex-col gap-6 xl:flex-row">
        <div className="min-w-0 flex-1">
          <SaasCard brand className="mb-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-200">SmartLibDesk Enterprise</p>
                <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
                  Welcome back, <span className="text-emerald-200">{adminName}</span> 👋
                </h1>
                <p className="mt-2 max-w-xl text-sm text-white/65">
                  Platform overview · subscriptions · libraries · revenue analytics
                </p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-right backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200">Monthly Revenue</p>
                <p className="mt-0.5 font-display text-xl font-bold text-white">{formatInr(mgmt.monthlyRevenue)}</p>
                {revenueOverview.todayRevenue > 0 ? (
                  <p className="mt-1 text-xs text-white/55">Today: {formatInr(revenueOverview.todayRevenue)}</p>
                ) : null}
              </div>
            </div>
          </SaasCard>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <DashboardKpiCard
              index={0}
              label="Total Libraries"
              value={mgmt.totalLibraries.toLocaleString('en-IN')}
              hint={`${recent.length} joined recently`}
              trend={formatGrowth(trends.newLibraries.growthPercent)}
              icon="🏛"
              accent="primary"
              dark
            />
            <DashboardKpiCard
              index={1}
              label="Total Revenue"
              value={formatInr(stats.revenue)}
              hint="All-time collected"
              trend={formatGrowth(revenueOverview.growthPercent)}
              icon="💰"
              accent="teal"
              dark
            />
            <DashboardKpiCard
              index={2}
              label="Active Subscribers"
              value={mgmt.activeSubscribers.toLocaleString('en-IN')}
              hint={`${overview.active} active subs`}
              trend={formatGrowth(trends.subscriptionGrowth.growthPercent)}
              icon="👥"
              accent="green"
              dark
            />
            <DashboardKpiCard
              index={3}
              label="Expiring Soon"
              value={mgmt.expiringPlans.toLocaleString('en-IN')}
              hint={`${trends.expiryTrend.total7d} in next 7 days`}
              icon="⏰"
              accent="amber"
              dark
            />
          </div>

          <SaasCard className="mt-6" padding="sm" brand>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-emerald-200">Quick Actions</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_ACTIONS.map((a, i) => (
                <Link
                  key={a.label}
                  to={a.to}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
                    i === 0
                      ? 'bg-white text-emerald-800 shadow-md hover:brightness-105'
                      : 'border border-white/20 bg-white/10 text-white hover:bg-white/15'
                  }`}
                >
                  <span>{a.icon}</span>
                  {a.label}
                </Link>
              ))}
            </div>
          </SaasCard>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <RevenueAreaChart
                value={revenueOverview.monthlyRevenue}
                series={revenueOverview.monthlyTrend}
                dark
                label="Revenue Analytics"
                subtitle="Monthly paid subscription revenue"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <MiniChart title="New Libraries" value={trends.newLibraries.total7d} bars={libraryBars} />
              <MiniChart title="Subscription Growth" value={trends.subscriptionGrowth.total7d} bars={subscriptionBars} />
              <MiniChart title="Expiry Trends" value={trends.expiryTrend.total7d} bars={expiryBars} warn />
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <SaasCard className="lg:col-span-1" brand>
              <h2 className="font-display text-base font-bold text-white">
                <span className="text-emerald-200">Plan</span> Distribution
              </h2>
              {planDistribution.segments.length === 0 ? (
                <p className="mt-4 text-sm text-white/60">No library plans yet.</p>
              ) : (
                <div className="mt-4 flex items-center gap-4">
                  <div
                    className="relative h-28 w-28 shrink-0 rounded-full"
                    style={{ background: conicGradient(planDistribution.segments) }}
                  >
                    <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-emerald-900/80 text-center">
                      <span className="text-xs font-bold text-white">{planDistribution.total}</span>
                      <span className="block text-[10px] text-white/60">libraries</span>
                    </div>
                  </div>
                  <ul className="space-y-2 text-sm">
                    {planDistribution.segments.slice(0, 5).map((seg) => (
                      <Legend key={seg.key} color={seg.color} label={`${seg.label} (${seg.count})`} />
                    ))}
                  </ul>
                </div>
              )}
            </SaasCard>

            <SaasCard className="lg:col-span-2" brand>
              <h2 className="font-display text-base font-bold text-white">
                <span className="text-emerald-200">Subscription</span> Health
              </h2>
              <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <HealthStat label="Active" value={overview.active} tone="success" />
                <HealthStat label="Expiring" value={overview.expiringSoon} tone="warning" />
                <HealthStat label="Expired" value={overview.expired} tone="danger" />
                <HealthStat label="Cancelled" value={overview.cancelled} tone="neutral" />
              </dl>
              {revenueOverview.pendingRenewals > 0 ? (
                <p className="mt-4 text-xs text-amber-200">
                  {revenueOverview.pendingRenewals} pending renewal request{revenueOverview.pendingRenewals === 1 ? '' : 's'}
                </p>
              ) : null}
            </SaasCard>
          </div>

          <div className="mt-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-white">
                  <span className="text-emerald-200">Library</span> Management
                </h2>
                <p className="text-sm text-white/65">{libTotal.toLocaleString('en-IN')} libraries on the platform</p>
              </div>
              <Link
                to="/superadmin/libraries"
                className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                View all →
              </Link>
            </div>
            {libLoading ? (
              <p className="py-8 text-center text-sm text-white/65">Loading libraries…</p>
            ) : (
              <SuperAdminTableScroll>
                <table>
                  <thead>
                    <tr>
                      <th>Library</th>
                      <th>Owner</th>
                      <th>Plan</th>
                      <th>Status</th>
                      <th>Expiry</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {libraries.map((lib) => (
                      <tr key={lib.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-bold text-emerald-200">
                              {lib.name.charAt(0).toUpperCase()}
                            </span>
                            <div>
                              <Link to={`/superadmin/libraries/${lib.id}`} className="font-medium text-white hover:text-emerald-200">
                                {lib.name}
                              </Link>
                              <p className="text-xs text-white/55">{lib.email || lib.libraryCode}</p>
                            </div>
                          </div>
                        </td>
                        <td>{lib.ownerName || '—'}</td>
                        <td>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${planBadge(lib.currentPlanKey || lib.plan)}`}>
                            {lib.planName || lib.currentPlanKey || lib.plan || 'none'}
                          </span>
                        </td>
                        <td>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusBadge(lib.subscriptionStatus || '', lib.isActive)}`}>
                            {lib.isActive ? lib.subscriptionStatus || 'active' : 'blocked'}
                          </span>
                        </td>
                        <td>
                          {lib.planExpiryDate
                            ? new Date(lib.planExpiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                            : '—'}
                        </td>
                        <td>
                          <Link to={`/superadmin/libraries/${lib.id}`} className="text-xs font-semibold text-emerald-200 hover:underline">
                            Manage
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </SuperAdminTableScroll>
            )}
            <SuperAdminPagination page={libPage} totalPages={libTotalPages} total={libTotal} onPageChange={setLibPage} />
          </div>
        </div>

        <aside className="hidden w-full shrink-0 xl:block xl:w-72">
          <div className="sticky top-20">
            <SuperAdminRightPanel notifications={notifications} activities={activityFeed} />
          </div>
        </aside>
      </div>
    </div>
  );
}

function MiniChart({
  title,
  value,
  bars,
  warn,
}: {
  title: string;
  value: number;
  bars: number[];
  warn?: boolean;
}) {
  const max = Math.max(...bars, 1);
  const hasData = bars.some((b) => b > 0);

  return (
    <SaasCard padding="sm" brand>
      <p className="text-xs font-semibold text-emerald-200">{title}</p>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
      <div className="mt-3 flex h-12 items-end gap-1">
        {hasData ? (
          bars.map((b, i) => (
            <span
              key={i}
              className={`flex-1 rounded-sm ${warn ? 'bg-amber-400/70' : 'bg-gradient-to-t from-emerald-300 to-emerald-100 opacity-80'}`}
              style={{ height: `${(b / max) * 100}%`, minHeight: 4 }}
            />
          ))
        ) : (
          <p className="w-full text-center text-[11px] text-white/45">No activity in last 7 days</p>
        )}
      </div>
    </SaasCard>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <li className="flex items-center gap-2 text-white/70">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </li>
  );
}

function HealthStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'success' | 'warning' | 'danger' | 'neutral';
}) {
  const colors = {
    success: 'text-emerald-200',
    warning: 'text-amber-200',
    danger: 'text-red-200',
    neutral: 'text-white/80',
  };
  const bg = {
    success: 'bg-emerald-500/15',
    warning: 'bg-amber-500/15',
    danger: 'bg-red-500/15',
    neutral: 'bg-white/10',
  };
  return (
    <div className={`rounded-xl p-3 ${bg[tone]}`}>
      <dt className="text-xs uppercase tracking-wide text-white/60">{label}</dt>
      <dd className={`mt-1 text-2xl font-bold ${colors[tone]}`}>{value}</dd>
    </div>
  );
}
