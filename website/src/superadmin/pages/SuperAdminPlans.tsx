import { useCallback, useEffect, useState } from 'react';
import { DashboardKpiCard } from '../../components/dashboard/DashboardKpiCard';
import { DashboardPageHeader } from '../../components/dashboard/DashboardPageHeader';
import { Button } from '../../components/ui/Button';
import { SuperAdminPagination } from '../components/SuperAdminPagination';
import { SuperAdminTableScroll } from '../components/SuperAdminTableScroll';
import {
  clonePlan,
  createPlan,
  deletePlan,
  fetchPlanAnalytics,
  fetchPlanAuditLogs,
  fetchPlanManagementOverview,
  fetchPlans,
  fetchSuperAdminLibraries,
  updatePlan,
  type PlanAnalytics,
  type PlanAuditLog,
  type PlanManagementOverview,
  type PlanPayload,
  type PlanRow,
} from '../api/superadminApi';
import { PlanFormModal } from '../components/PlanFormModal';
import { SaasCard } from '../components/SaasCard';

function formatInr(amount: number) {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function planTypeBadge(type?: string, label?: string) {
  const t = type || 'public';
  const colors: Record<string, string> = {
    trial: 'bg-amber-500/20 text-amber-200',
    one_time: 'bg-orange-500/20 text-orange-200',
    library_specific: 'bg-violet-500/20 text-violet-200',
    promotional: 'bg-pink-500/20 text-pink-200',
    public: 'bg-emerald-500/20 text-emerald-200',
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors[t] || colors.public}`}>
      {label || 'Public'}
    </span>
  );
}

function actionLabel(action: string) {
  return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const PAGE_SIZE = 10;

export function SuperAdminPlans() {
  const [overview, setOverview] = useState<PlanManagementOverview | null>(null);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<PlanAuditLog[]>([]);
  const [libraries, setLibraries] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PlanRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [analyticsPlan, setAnalyticsPlan] = useState<PlanRow | null>(null);
  const [analytics, setAnalytics] = useState<PlanAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<PlanRow | null>(null);
  const [planPage, setPlanPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);

  const planTotalPages = Math.max(1, Math.ceil(plans.length / PAGE_SIZE));
  const auditTotalPages = Math.max(1, Math.ceil(auditLogs.length / PAGE_SIZE));
  const pagedPlans = plans.slice((planPage - 1) * PAGE_SIZE, planPage * PAGE_SIZE);
  const pagedAuditLogs = auditLogs.slice((auditPage - 1) * PAGE_SIZE, auditPage * PAGE_SIZE);

  useEffect(() => {
    if (planPage > planTotalPages) setPlanPage(planTotalPages);
  }, [planPage, planTotalPages]);

  useEffect(() => {
    if (auditPage > auditTotalPages) setAuditPage(auditTotalPages);
  }, [auditPage, auditTotalPages]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ov, rows, logs, libs] = await Promise.all([
        fetchPlanManagementOverview(),
        fetchPlans(),
        fetchPlanAuditLogs(50),
        fetchSuperAdminLibraries({ limit: 200 }),
      ]);
      setOverview(ov);
      setPlans(rows);
      setAuditLogs(logs);
      setLibraries(libs.libraries.map((l) => ({ id: l.id, name: l.name })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (plan: PlanRow) => {
    setEditing(plan);
    setModalOpen(true);
  };

  const handleSave = async (payload: PlanPayload) => {
    setSaving(true);
    try {
      if (editing?._id) await updatePlan(editing._id, payload);
      else await createPlan(payload);
      setModalOpen(false);
      setEditing(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleClone = async (plan: PlanRow) => {
    if (!window.confirm(`Clone "${plan.name}"?`)) return;
    try {
      await clonePlan(plan._id);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Clone failed');
    }
  };

  const handleToggle = async (plan: PlanRow) => {
    try {
      await updatePlan(plan._id, { isActive: !plan.isActive });
      setPlans((prev) => prev.map((p) => (p._id === plan._id ? { ...p, isActive: !p.isActive } : p)));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Update failed');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deletePlan(confirmDelete._id);
      setConfirmDelete(null);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const openAnalytics = async (plan: PlanRow) => {
    setAnalyticsPlan(plan);
    setAnalytics(null);
    setAnalyticsLoading(true);
    try {
      const data = await fetchPlanAnalytics(plan._id);
      setAnalytics(data);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to load analytics');
      setAnalyticsPlan(null);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  if (loading) {
    return <p className="page-pad text-white/65">Loading plan management…</p>;
  }

  return (
    <div className="page-pad">
      <DashboardPageHeader
        dark
        title="Plan Management"
        subtitle="Enterprise subscription plans · offers · analytics"
        action={{ label: '+ Create Plan', onClick: openCreate }}
      />

      {error ? (
        <SaasCard error className="mb-6">
          <p className="text-sm text-red-200">{error}</p>
          <Button className="mt-3" size="sm" onClick={() => void load()}>
            Retry
          </Button>
        </SaasCard>
      ) : null}

      {overview ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardKpiCard label="Total Libraries" value={overview.totalLibraries.toLocaleString('en-IN')} icon="🏛" accent="green" index={0} dark />
          <DashboardKpiCard label="Active Subscribers" value={overview.activeSubscribers.toLocaleString('en-IN')} icon="👥" accent="blue" index={1} dark />
          <DashboardKpiCard label="Monthly Revenue" value={formatInr(overview.monthlyRevenue)} icon="💎" accent="purple" index={2} dark />
          <DashboardKpiCard label="Expiring Plans" value={overview.expiringPlans.toLocaleString('en-IN')} icon="⏰" accent="amber" index={3} dark />
        </div>
      ) : null}

      <SaasCard padding="none" className="mt-6 overflow-hidden">
        <div className="border-b border-white/10 px-5 py-4">
          <h2 className="font-semibold text-white">All Plans</h2>
          <p className="text-xs text-white/60">{plans.length} plans configured</p>
        </div>
        <SuperAdminTableScroll>
          <table className="min-w-[720px]">
            <thead>
              <tr>
                <th className="px-5 py-3">Plan Name</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Price</th>
                <th className="px-5 py-3">Libraries</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-white/60">
                    No plans yet. Create your first subscription plan.
                  </td>
                </tr>
              ) : (
                pagedPlans.map((plan) => {
                  const isSystem = String(plan.key).toLowerCase() === 'trial';
                  return (
                    <tr key={plan._id}>
                      <td className="px-5 py-4">
                        <p className="font-medium text-white">{plan.name}</p>
                        <p className="text-xs text-white/55">{plan.key}</p>
                        {plan.isOneTimeOffer ? (
                          <span className="mt-1 inline-block text-xs text-orange-200">🟠 One-Time Offer</span>
                        ) : null}
                      </td>
                      <td className="px-5 py-4">{planTypeBadge(plan.planType, plan.planTypeLabel)}</td>
                      <td className="px-5 py-4 font-semibold">{formatInr(plan.finalPrice ?? plan.price)}</td>
                      <td className="px-5 py-4 text-white/80">{plan.librariesLabel || 'All'}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            plan.isActive ? 'bg-emerald-500/20 text-emerald-200' : 'bg-white/10 text-white/60'
                          }`}
                        >
                          {plan.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <ActionBtn onClick={() => void openAnalytics(plan)}>View</ActionBtn>
                          <ActionBtn onClick={() => openEdit(plan)}>Edit</ActionBtn>
                          <ActionBtn onClick={() => void handleClone(plan)}>Clone</ActionBtn>
                          <ActionBtn onClick={() => void handleToggle(plan)}>{plan.isActive ? 'Disable' : 'Enable'}</ActionBtn>
                          {!isSystem ? (
                            <ActionBtn danger onClick={() => setConfirmDelete(plan)}>
                              Delete
                            </ActionBtn>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </SuperAdminTableScroll>
        <div className="border-t border-white/10 px-5 pb-4">
          <SuperAdminPagination
            page={planPage}
            totalPages={planTotalPages}
            total={plans.length}
            onPageChange={setPlanPage}
            className="!mt-4"
          />
        </div>
      </SaasCard>

      <SaasCard className="mt-6">
        <h2 className="font-semibold text-white">Audit Logs</h2>
        <p className="mt-1 text-xs text-white/60">Track every plan change · admin · library · IP</p>
        {auditLogs.length === 0 ? (
          <p className="mt-4 text-sm text-white/60">No audit entries yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm text-white">
              <thead>
                <tr className="border-b border-white/15 text-xs uppercase text-white/60">
                  <th className="py-2 pr-4">Action</th>
                  <th className="py-2 pr-4">Plan</th>
                  <th className="py-2 pr-4">Library</th>
                  <th className="py-2 pr-4">Admin</th>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2">IP</th>
                </tr>
              </thead>
              <tbody>
                {pagedAuditLogs.map((log) => (
                  <tr key={log.id} className="border-b border-white/10 last:border-0">
                    <td className="py-3 pr-4 font-medium text-emerald-200">{actionLabel(log.action)}</td>
                    <td className="py-3 pr-4">{log.planName || '—'}</td>
                    <td className="py-3 pr-4 text-white/80">{log.libraryName || '—'}</td>
                    <td className="py-3 pr-4 text-white/80">{log.adminName || 'Super Admin'}</td>
                    <td className="py-3 pr-4 text-white/60">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString('en-IN') : '—'}
                    </td>
                    <td className="py-3 font-mono text-xs text-white/55">{log.ip || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {auditLogs.length > 0 ? (
          <SuperAdminPagination
            page={auditPage}
            totalPages={auditTotalPages}
            total={auditLogs.length}
            onPageChange={setAuditPage}
          />
        ) : null}
      </SaasCard>

      <PlanFormModal
        open={modalOpen}
        editing={editing}
        libraries={libraries}
        saving={saving}
        onClose={() => {
          if (saving) return;
          setModalOpen(false);
          setEditing(null);
        }}
        onSave={handleSave}
      />

      {analyticsPlan ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <SaasCard className="w-full max-w-md">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-white">{analyticsPlan.name}</h3>
                <p className="text-xs text-white/60">Per-plan analytics</p>
              </div>
              <button type="button" onClick={() => setAnalyticsPlan(null)} className="text-white/60 hover:text-white">
                ✕
              </button>
            </div>
            {analyticsLoading ? (
              <p className="mt-6 text-sm text-white/60">Loading analytics…</p>
            ) : analytics ? (
              <dl className="mt-6 grid grid-cols-2 gap-4">
                <Stat label="Views" value={analytics.views} />
                <Stat label="Purchases" value={analytics.purchases} />
                <Stat label="Conversion" value={`${analytics.conversionRate}%`} />
                <Stat label="Revenue" value={formatInr(analytics.revenue)} />
              </dl>
            ) : null}
          </SaasCard>
        </div>
      ) : null}

      {confirmDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <SaasCard className="w-full max-w-sm">
            <h3 className="font-bold text-white">Delete plan?</h3>
            <p className="mt-2 text-sm text-white/70">
              &ldquo;{confirmDelete.name}&rdquo; will be permanently removed.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConfirmDelete(null)}>
                Cancel
              </Button>
              <Button className="!bg-red-600 hover:!brightness-110" onClick={() => void handleDelete()}>
                Delete
              </Button>
            </div>
          </SaasCard>
        </div>
      ) : null}
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
        danger
          ? 'text-red-200 hover:bg-red-500/15'
          : 'text-emerald-200 hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-white/60">{label}</dt>
      <dd className="mt-1 text-xl font-bold text-white">{value}</dd>
    </div>
  );
}
