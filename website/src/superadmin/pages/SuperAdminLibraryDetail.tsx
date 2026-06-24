import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DashboardPageHeader } from '../../components/dashboard/DashboardPageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
  assignLibraryPlan,
  cancelLibrarySubscription,
  canDeleteLibrary,
  deleteLibrary,
  extendLibraryPlan,
  fetchLibraryDetail,
  fetchLibrarySubscription,
  fetchPlans,
  setLibraryBlocked,
  type LibraryDetail,
  type LibraryStats,
  type LibrarySubscriptionDetail,
  type PlanRow,
} from '../api/superadminApi';
import { SaasCard } from '../components/SaasCard';
import { SuperAdminTableScroll } from '../components/SuperAdminTableScroll';

function formatInr(amount: number) {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function planDisplayName(key: string) {
  if (key === 'monthly') return 'Monthly Plan';
  if (key === '6month') return '6 Month Plan';
  if (key === 'yearly') return 'Yearly Plan';
  if (key === 'trial') return 'Trial Plan';
  if (key === 'none') return 'No Plan';
  return key.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'active') return 'success';
  if (status === 'expired') return 'warning';
  if (status === 'cancelled') return 'danger';
  return 'neutral';
}

const toneClass = {
  success: 'bg-emerald-500/20 text-emerald-200',
  warning: 'bg-amber-500/20 text-amber-200',
  danger: 'bg-red-500/20 text-red-200',
  neutral: 'bg-white/10 text-white/80',
};

export function SuperAdminLibraryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [library, setLibrary] = useState<LibraryDetail | null>(null);
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [subscription, setSubscription] = useState<LibrarySubscriptionDetail | null>(null);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assignOpen, setAssignOpen] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [extraDays, setExtraDays] = useState('30');
  const [busy, setBusy] = useState(false);
  const [confirmAssign, setConfirmAssign] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const [detail, sub, allPlans] = await Promise.all([
        fetchLibraryDetail(id),
        fetchLibrarySubscription(id),
        fetchPlans(),
      ]);
      setLibrary(detail.library);
      setStats(detail.stats);
      setSubscription(sub);
      setPlans(allPlans.filter((p) => p.isActive));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load library');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedPlan = useMemo(
    () => plans.find((p) => p._id === selectedPlanId) || null,
    [plans, selectedPlanId]
  );

  const currentPlanKey = subscription?.subscription.plan || 'none';

  const handleAssign = async () => {
    if (!id || !selectedPlan) return;
    setBusy(true);
    try {
      await assignLibraryPlan(id, {
        planId: selectedPlan._id,
        previousPlanKey: currentPlanKey,
      });
      setAssignOpen(false);
      setConfirmAssign(false);
      setSelectedPlanId('');
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to assign plan');
    } finally {
      setBusy(false);
    }
  };

  const handleExtend = async () => {
    if (!id) return;
    const days = Number(extraDays);
    if (!Number.isFinite(days) || days < 1) return alert('Enter valid days');
    setBusy(true);
    try {
      await extendLibraryPlan(id, days);
      setExtendOpen(false);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to extend plan');
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    if (!window.confirm('Cancel subscription? Access continues until expiry.')) return;
    setBusy(true);
    try {
      await cancelLibrarySubscription(id);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to cancel');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleBlock = async () => {
    if (!library) return;
    const next = !library.isActive;
    if (!window.confirm(`${next ? 'Activate' : 'Block'} "${library.name}"?`)) return;
    setBusy(true);
    try {
      await setLibraryBlocked(library.id, next);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update library status');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!library) return;
    if (
      !window.confirm(
        `Permanently delete "${library.name}"?\n\nStudents, attendance, seats, and notifications will be removed. This cannot be undone.`
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await deleteLibrary(library.id);
      navigate('/superadmin/libraries', { replace: true });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete library');
      setBusy(false);
    }
  };

  if (loading) return <p className="page-pad text-white/65">Loading library profile…</p>;

  if (error || !library || !stats || !subscription) {
    return (
      <div className="page-pad">
        <SaasCard error>
          <p className="text-sm text-red-200">{error || 'Library not found'}</p>
          <Link to="/superadmin/libraries" className="mt-3 inline-block text-sm text-emerald-200 hover:underline">
            ← Back to libraries
          </Link>
        </SaasCard>
      </div>
    );
  }

  const subStatus = subscription.subscription.status;
  const tone = statusTone(subStatus);
  const deletable = canDeleteLibrary(library);

  return (
    <div className="page-pad">
      <Link to="/superadmin/libraries" className="text-sm text-white/65 hover:text-emerald-200">
        ← Libraries
      </Link>

      <DashboardPageHeader dark title={library.name} subtitle={`${library.libraryCode} · ${library.city}`} />

      <div className="grid gap-4 lg:grid-cols-3">
        <SaasCard className="lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200">Library Profile</p>
              <h2 className="mt-1 text-xl font-bold text-white">{library.ownerName}</h2>
              <p className="mt-1 text-sm text-white/65">{library.email}</p>
              {library.phone ? <p className="text-sm text-white/65">{library.phone}</p> : null}
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                library.isActive ? 'bg-emerald-500/20 text-emerald-200' : 'bg-red-500/20 text-red-200'
              }`}
            >
              {library.isActive ? 'Active' : 'Blocked'}
            </span>
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-4">
            <MiniStat label="Seats" value={stats.totalSeats} />
            <MiniStat label="Students" value={stats.totalStudents} />
            <MiniStat label="Active" value={stats.activeStudents} />
            <MiniStat label="Revenue" value={formatInr(stats.revenue)} />
          </dl>
        </SaasCard>

        <SaasCard>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200">Subscription</p>
          <h3 className="mt-2 text-lg font-bold text-white">{planDisplayName(subscription.subscription.plan)}</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-white/60">Price</dt>
              <dd className="font-semibold">{formatInr(subscription.subscription.price)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-white/60">Expiry</dt>
              <dd>{formatDate(subscription.subscription.expiryDate)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-white/60">Status</dt>
              <dd>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${toneClass[tone]}`}>
                  {subStatus.charAt(0).toUpperCase() + subStatus.slice(1)}
                </span>
              </dd>
            </div>
          </dl>

          <div className="mt-5 space-y-2">
            <Button fullWidth size="sm" onClick={() => setAssignOpen(true)} disabled={busy}>
              Change Plan
            </Button>
            <Button
              fullWidth
              size="sm"
              variant="outline"
              className="!border-white/25 !text-white hover:!bg-white/10"
              onClick={() => setExtendOpen(true)}
              disabled={busy}
            >
              Extend Plan
            </Button>
            <Button
              fullWidth
              size="sm"
              variant="outline"
              className="!border-red-400/40 !text-red-200 hover:!bg-red-500/15"
              onClick={() => void handleCancel()}
              disabled={busy || subStatus === 'cancelled'}
            >
              Cancel Plan
            </Button>
          </div>
        </SaasCard>
      </div>

      <SaasCard className="mt-6 border border-red-400/20">
        <p className="text-xs font-semibold uppercase tracking-wide text-red-200">Danger zone</p>
        <h3 className="mt-1 text-lg font-bold text-white">Library access</h3>
        <p className="mt-2 text-sm text-white/65">
          Block stops library login and operations. Delete permanently removes this library and its tenant data.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            size="sm"
            variant="outline"
            className="!border-white/25 !text-white hover:!bg-white/10"
            onClick={() => void handleToggleBlock()}
            disabled={busy}
          >
            {library.isActive ? 'Block library' : 'Activate library'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="!border-red-400/40 !text-red-200 hover:!bg-red-500/15"
            onClick={() => void handleDelete()}
            disabled={busy || !deletable}
          >
            Delete library
          </Button>
        </div>
        {!deletable ? (
          <p className="mt-3 text-xs text-white/50">
            Delete is only available for active PRO libraries before plan expiry (platform rule).
          </p>
        ) : null}
      </SaasCard>

      {subscription.payments.length > 0 ? (
        <div className="mt-6">
          <h2 className="mb-4 font-semibold text-white">Recent Payments</h2>
          <SuperAdminTableScroll>
            <table>
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {subscription.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="capitalize">{p.plan}</td>
                    <td>{formatInr(p.amount)}</td>
                    <td>{p.status}</td>
                    <td>{formatDate(p.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SuperAdminTableScroll>
        </div>
      ) : null}

      {assignOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center">
          <SaasCard className="w-full max-w-md">
            <h3 className="text-lg font-bold text-white">Manual Plan Assignment</h3>
            <p className="mt-1 text-sm text-white/65">Select a plan to assign immediately</p>

            {!confirmAssign ? (
              <>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-white/80">Choose Plan</label>
                  <select
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                    className="superadmin-select focus-ring-brand mt-1.5 w-full rounded-xl border border-white/20 px-4 py-3 text-sm text-white"
                  >
                    <option value="">Select plan…</option>
                    {plans.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} — {formatInr(p.finalPrice ?? p.price)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-5 flex justify-end gap-3">
                  <Button variant="outline" className="!border-white/25 !text-white hover:!bg-white/10" onClick={() => setAssignOpen(false)}>
                    Cancel
                  </Button>
                  <Button disabled={!selectedPlanId} onClick={() => setConfirmAssign(true)}>
                    Apply
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-4 text-sm text-white/80">
                  Change <strong className="text-white">{library.name}</strong> from{' '}
                  <strong className="text-white">{planDisplayName(currentPlanKey)}</strong> to{' '}
                  <strong className="text-white">{selectedPlan?.name}</strong>?
                </p>
                <p className="mt-2 text-xs text-emerald-200">Immediate activation — no payment required</p>
                <div className="mt-5 flex justify-end gap-3">
                  <Button variant="outline" className="!border-white/25 !text-white hover:!bg-white/10" onClick={() => setConfirmAssign(false)} disabled={busy}>
                    Back
                  </Button>
                  <Button onClick={() => void handleAssign()} disabled={busy}>
                    {busy ? 'Applying…' : 'Confirm'}
                  </Button>
                </div>
              </>
            )}
          </SaasCard>
        </div>
      ) : null}

      {extendOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <SaasCard className="w-full max-w-sm">
            <h3 className="font-bold text-white">Extend Plan</h3>
            <div className="mt-4">
              <Input label="Extra Days" type="number" min={1} value={extraDays} onChange={(e) => setExtraDays(e.target.value)} dark />
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="outline" className="!border-white/25 !text-white hover:!bg-white/10" onClick={() => setExtendOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={() => void handleExtend()} disabled={busy}>
                {busy ? 'Extending…' : 'Extend'}
              </Button>
            </div>
          </SaasCard>
        </div>
      ) : null}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-white/60">{label}</dt>
      <dd className="mt-1 text-lg font-bold text-white">{value}</dd>
    </div>
  );
}
