import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardKpiCard } from '../../components/dashboard/DashboardKpiCard';
import { DashboardPageHeader } from '../../components/dashboard/DashboardPageHeader';
import {
  fetchPlanManagementOverview,
  fetchSubscriptionOverview,
  type PlanManagementOverview,
} from '../api/superadminApi';
import { SaasCard } from '../components/SaasCard';

function formatInr(amount: number) {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function SuperAdminSubscriptions() {
  const [overview, setOverview] = useState<PlanManagementOverview | null>(null);
  const [health, setHealth] = useState({ active: 0, expiringSoon: 0, expired: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([fetchPlanManagementOverview(), fetchSubscriptionOverview()])
      .then(([mgmt, sub]) => {
        setOverview(mgmt);
        setHealth(sub);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="page-pad text-white/65">Loading subscription overview…</p>;

  if (error) {
    return (
      <div className="page-pad">
        <SaasCard error>
          <p className="text-sm text-red-200">{error}</p>
        </SaasCard>
      </div>
    );
  }

  return (
    <div className="page-pad">
      <DashboardPageHeader
        dark
        title="Subscription Overview"
        subtitle="SmartLibDesk Enterprise Plan Management"
        action={{ label: 'Manage Plans', to: '/superadmin/plans' }}
      />

      {overview ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardKpiCard index={0} label="Total Libraries" value={overview.totalLibraries.toLocaleString('en-IN')} icon="🏛" accent="green" dark />
          <DashboardKpiCard index={1} label="Active Subscribers" value={overview.activeSubscribers.toLocaleString('en-IN')} icon="👥" accent="blue" dark />
          <DashboardKpiCard index={2} label="Monthly Revenue" value={formatInr(overview.monthlyRevenue)} icon="💎" accent="purple" dark />
          <DashboardKpiCard index={3} label="Expiring Plans" value={overview.expiringPlans.toLocaleString('en-IN')} hint="Within renewal window" icon="⏰" accent="amber" dark />
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <SaasCard>
          <h2 className="font-semibold text-white">Subscription Health</h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-white/60">Active</dt>
              <dd className="text-2xl font-bold text-emerald-200">{health.active}</dd>
            </div>
            <div>
              <dt className="text-white/60">Expiring soon</dt>
              <dd className="text-2xl font-bold text-amber-200">{health.expiringSoon}</dd>
            </div>
            <div>
              <dt className="text-white/60">Expired</dt>
              <dd className="text-2xl font-bold text-white/80">{health.expired}</dd>
            </div>
            <div>
              <dt className="text-white/60">Cancelled</dt>
              <dd className="text-2xl font-bold text-red-200">{health.cancelled}</dd>
            </div>
          </dl>
        </SaasCard>

        <SaasCard>
          <h2 className="font-semibold text-white">Plan Visibility Engine</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div>
              <p className="font-semibold text-emerald-200">Show plan when</p>
              <ul className="mt-1 list-inside list-disc text-white/65">
                <li>Public: all libraries</li>
                <li>Private: library included in allowlist</li>
                <li>One-time: not used before</li>
                <li>Promotion: current date within offer window</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-red-200">Hide plan when</p>
              <ul className="mt-1 list-inside list-disc text-white/65">
                <li>Already purchased (one-time)</li>
                <li>Offer expired</li>
                <li>Library not eligible</li>
                <li>Plan disabled</li>
              </ul>
            </div>
          </div>
        </SaasCard>
      </div>

      <SaasCard className="mt-6">
        <h2 className="font-semibold text-white">Quick Actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            to="/superadmin/plans"
            className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 shadow-md hover:brightness-105"
          >
            Plan Management →
          </Link>
          <Link
            to="/superadmin/libraries"
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15"
          >
            Library Profiles →
          </Link>
        </div>
      </SaasCard>
    </div>
  );
}
