import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimateIn } from '../../components/ui/AnimateIn';
import { DashboardKpiCard } from '../../components/dashboard/DashboardKpiCard';
import { DashboardPageHeader } from '../../components/dashboard/DashboardPageHeader';
import { GeoLibrariesMap } from '../../components/dashboard/GeoLibrariesMap';
import { RevenueAreaChart } from '../../components/dashboard/RevenueAreaChart';
import { SystemHealthGauge } from '../../components/dashboard/SystemHealthGauge';
import { GlassCard } from '../../components/ui/GlassCard';
import {
  fetchRecentLibraries,
  fetchSubscriptionOverview,
  fetchSuperAdminDashboard,
  fetchSuperAdminLibraries,
  type SuperAdminLibrary,
  type SuperAdminStats,
} from '../api/superadminApi';

export function SuperAdminDashboard() {
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [overview, setOverview] = useState({ active: 0, expiringSoon: 0, expired: 0, cancelled: 0 });
  const [recent, setRecent] = useState<SuperAdminLibrary[]>([]);
  const [mapLibraries, setMapLibraries] = useState<SuperAdminLibrary[]>([]);
  const [totalLibraries, setTotalLibraries] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchSuperAdminDashboard(),
      fetchSubscriptionOverview(),
      fetchRecentLibraries(8),
      fetchSuperAdminLibraries({ page: 1, limit: 20 }),
    ])
      .then(([s, o, libs, all]) => {
        setStats(s);
        setOverview(o);
        setRecent(libs);
        setMapLibraries(all.libraries);
        setTotalLibraries(all.total);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="page-pad text-slate-400">Loading global intelligence…</p>;

  if (error) {
    return (
      <div className="page-pad">
        <GlassCard dark padding="md" className="border-red-500/30">
          <p className="text-sm text-red-300">{error}</p>
        </GlassCard>
      </div>
    );
  }

  if (!stats) return null;

  const churnRate =
    stats.totalLibraries > 0
      ? (((overview.expired + overview.cancelled) / stats.totalLibraries) * 100).toFixed(1)
      : '0.0';
  const arrEstimate = stats.revenue * 12;
  const mrrEstimate = stats.revenue;

  return (
    <div className="page-pad">
      <DashboardPageHeader
        dark
        title="Super Admin Global Intelligence"
        subtitle="Platform-wide metrics · live overview"
        action={{ label: 'View Libraries', to: '/superadmin/libraries' }}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardKpiCard
          dark
          index={0}
          label="ARR (est.)"
          value={`₹${arrEstimate.toLocaleString('en-IN')}`}
          hint="Annualized revenue"
          icon="📈"
          accent="cyan"
        />
        <DashboardKpiCard
          dark
          index={1}
          label="MRR"
          value={`₹${mrrEstimate.toLocaleString('en-IN')}`}
          hint="Paid subscriptions"
          icon="💎"
          accent="purple"
        />
        <DashboardKpiCard
          dark
          index={2}
          label="Churn Rate"
          value={`${churnRate}%`}
          hint={`${overview.expired + overview.cancelled} inactive`}
          icon="📉"
          accent="amber"
        />
        <DashboardKpiCard
          dark
          index={3}
          label="Total Libraries"
          value={stats.totalLibraries.toLocaleString('en-IN')}
          hint={`${stats.activeLibraries} active`}
          icon="🏛"
          accent="green"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <AnimateIn delay={0}>
          <GeoLibrariesMap libraries={mapLibraries} total={totalLibraries || stats.totalLibraries} />
        </AnimateIn>
        <AnimateIn delay={100}>
          <RevenueAreaChart value={stats.revenue} />
        </AnimateIn>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <SystemHealthGauge label="Server Load" value={94} dark />
        <SystemHealthGauge label="Database Health" value={98} dark />
        <SystemHealthGauge label="API Latency" value={92} dark />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <GlassCard dark padding="md">
          <h2 className="font-semibold text-white">Subscriptions</h2>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-slate-400">Active</dt>
              <dd className="text-xl font-bold text-emerald-400">{overview.active}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Expiring soon</dt>
              <dd className="text-xl font-bold text-amber-400">{overview.expiringSoon}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Expired</dt>
              <dd className="text-xl font-bold text-slate-300">{overview.expired}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Cancelled</dt>
              <dd className="text-xl font-bold text-red-400">{overview.cancelled}</dd>
            </div>
          </dl>
          <Link to="/superadmin/subscriptions" className="mt-4 inline-block text-sm font-semibold text-cyan-400 hover:text-cyan-300">
            View subscriptions →
          </Link>
        </GlassCard>

        <GlassCard dark padding="md">
          <h2 className="font-semibold text-white">New libraries</h2>
          {recent.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No recent libraries.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {recent.map((lib) => (
                <li key={lib.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-white">{lib.name}</span>
                  <span className="shrink-0 text-xs text-slate-500">{lib.planName || lib.city || ''}</span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/superadmin/libraries" className="mt-4 inline-block text-sm font-semibold text-cyan-400 hover:text-cyan-300">
            All libraries →
          </Link>
        </GlassCard>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <DashboardKpiCard dark label="Total Students" value={stats.totalStudents.toLocaleString('en-IN')} icon="👥" accent="blue" />
        <DashboardKpiCard dark label="Active Libraries" value={stats.activeLibraries.toLocaleString('en-IN')} icon="✓" accent="green" />
      </div>
    </div>
  );
}
