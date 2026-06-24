import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardKpiCard } from '../../components/dashboard/DashboardKpiCard';
import { Input } from '../../components/ui/Input';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import {
  fetchLibraryPlanCounts,
  fetchPaymentsOverview,
  fetchSuperAdminPayments,
  type PaymentsOverview,
  type PlanLibraryCounts,
  type SuperAdminPaymentRow,
} from '../api/superadminApi';
import { SaasCard } from '../components/SaasCard';
import { SuperAdminPageTitle } from '../components/SuperAdminPageTitle';
import { SuperAdminPagination } from '../components/SuperAdminPagination';
import { SuperAdminTableScroll } from '../components/SuperAdminTableScroll';

const PAGE_SIZE = 15;
const SEARCH_DEBOUNCE_MS = 350;

type PlanFilter = keyof PlanLibraryCounts;
type StatusFilter = 'all' | 'paid' | 'pending' | 'failed' | 'refunded';

const PLAN_CHIPS: { key: PlanFilter; label: string; accent: string }[] = [
  { key: 'all', label: 'All', accent: 'from-indigo-500 to-violet-500' },
  { key: 'free', label: 'Free', accent: 'from-slate-500 to-slate-400' },
  { key: 'pro', label: 'Pro', accent: 'from-indigo-600 to-cyan-500' },
  { key: 'trial', label: 'Trial', accent: 'from-amber-500 to-yellow-400' },
  { key: 'none', label: 'None', accent: 'from-red-500 to-rose-400' },
];

const STATUS_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All status' },
  { key: 'paid', label: 'Success' },
  { key: 'pending', label: 'Pending' },
  { key: 'failed', label: 'Failed' },
  { key: 'refunded', label: 'Refunded' },
];

function formatInr(amount: number) {
  return `₹${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

function StatusBadge({ status }: { status: string }) {
  const s = String(status || '').toLowerCase();
  const cls =
    s === 'paid'
      ? 'bg-emerald-500/20 text-emerald-200 ring-emerald-400/30'
      : s === 'pending'
        ? 'bg-amber-500/20 text-amber-200 ring-amber-400/30'
        : s === 'failed'
          ? 'bg-red-500/20 text-red-200 ring-red-400/30'
          : 'bg-white/10 text-white/70 ring-white/20';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ring-1 ${cls}`}>
      {s || '—'}
    </span>
  );
}

export function SuperAdminPayments() {
  const [overview, setOverview] = useState<PaymentsOverview | null>(null);
  const [planCounts, setPlanCounts] = useState<PlanLibraryCounts | null>(null);
  const [payments, setPayments] = useState<SuperAdminPaymentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [planFilter, setPlanFilter] = useState<PlanFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput.trim(), SEARCH_DEBOUNCE_MS);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState('');
  const [listError, setListError] = useState('');

  const loadMeta = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ov, counts] = await Promise.all([fetchPaymentsOverview(), fetchLibraryPlanCounts()]);
      setOverview(ov);
      setPlanCounts(counts);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load payment analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError('');
    try {
      const res = await fetchSuperAdminPayments({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch,
        paymentStatus: statusFilter,
        planType: planFilter,
      });
      setPayments(res.payments);
      setTotal(res.total);
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Failed to load payments');
      setPayments([]);
      setTotal(0);
    } finally {
      setListLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, planFilter]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, planFilter]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const growthLabel = useMemo(() => {
    if (!overview) return undefined;
    const g = overview.growthPercent;
    if (!Number.isFinite(g) || g === 0) return undefined;
    return `${g > 0 ? '+' : ''}${g.toFixed(1)}% MoM`;
  }, [overview]);

  if (loading && !overview) {
    return <p className="page-pad text-white/65">Loading payment details…</p>;
  }

  return (
    <div className="page-pad">
      <SuperAdminPageTitle
        title="Payment Details"
        subtitle="Cross-library Razorpay ledger, plan stats, and payment history"
      />

      {error ? (
        <SaasCard error className="mb-6">
          <p className="text-sm text-red-200">{error}</p>
          <button type="button" onClick={() => void loadMeta()} className="mt-2 text-sm font-semibold text-emerald-200 underline">
            Retry
          </button>
        </SaasCard>
      ) : null}

      {overview ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <DashboardKpiCard
            index={0}
            label="Total Revenue"
            value={formatInr(overview.totalRevenue)}
            hint={growthLabel}
            icon="💎"
            accent="purple"
            dark
          />
          <DashboardKpiCard
            index={1}
            label="Monthly Revenue"
            value={formatInr(overview.monthlyRevenue)}
            icon="📈"
            accent="blue"
            dark
          />
          <DashboardKpiCard
            index={2}
            label="Today Revenue"
            value={formatInr(overview.todayRevenue)}
            icon="📅"
            accent="green"
            dark
          />
          <DashboardKpiCard
            index={3}
            label="Pending"
            value={String(overview.pendingPayments)}
            icon="⏳"
            accent="amber"
            dark
          />
          <DashboardKpiCard
            index={4}
            label="Failed"
            value={String(overview.failedPayments)}
            icon="✕"
            accent="amber"
            dark
          />
          <DashboardKpiCard
            index={5}
            label="Active Subscriptions"
            value={String(overview.activeSubscriptions)}
            icon="✓"
            accent="green"
            dark
          />
        </div>
      ) : null}

      <SaasCard className="mt-6">
        <p className="text-xs font-bold uppercase tracking-wider text-white/50">Library plans</p>
        <h2 className="mt-1 font-semibold text-white">Payment stats by plan</h2>
        <p className="mt-1 text-sm text-white/60">Tap a plan to filter the ledger below.</p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {PLAN_CHIPS.map((chip) => {
            const active = planFilter === chip.key;
            const count = planCounts?.[chip.key] ?? 0;
            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => setPlanFilter(chip.key)}
                className={`rounded-2xl border p-4 text-left transition ${
                  active
                    ? `border-white/30 bg-gradient-to-br ${chip.accent} shadow-lg`
                    : 'border-white/15 bg-white/5 hover:bg-white/10'
                }`}
              >
                <p className={`text-xs font-bold uppercase tracking-wide ${active ? 'text-white/90' : 'text-white/55'}`}>
                  {chip.label}
                </p>
                <p className={`mt-2 text-2xl font-bold ${active ? 'text-white' : 'text-white/90'}`}>
                  {planCounts ? count.toLocaleString('en-IN') : '…'}
                </p>
                <p className={`mt-0.5 text-xs font-medium ${active ? 'text-white/80' : 'text-white/50'}`}>libraries</p>
              </button>
            );
          })}
        </div>
      </SaasCard>

      <SaasCard className="mt-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-[200px] flex-1">
            <Input
              label="Search"
              dark
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Library, owner, email, transaction ID…"
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/55">Payment status</p>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setStatusFilter(opt.key)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                    statusFilter === opt.key
                      ? 'border-indigo-300/50 bg-indigo-500/20 text-indigo-100'
                      : 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {listError ? (
          <p className="mt-4 text-sm text-red-300">{listError}</p>
        ) : null}

        <div className="mt-5">
          {listLoading ? (
            <p className="py-8 text-center text-sm text-white/60">Loading payments…</p>
          ) : payments.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/60">No payments match your filters.</p>
          ) : (
            <SuperAdminTableScroll>
              <table>
                <thead>
                  <tr>
                    <th>Library</th>
                    <th>Owner</th>
                    <th>Amount</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>Paid</th>
                    <th>Txn ID</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {payments.map((row) => (
                    <tr key={row.id}>
                      <td className="font-medium text-white">
                        {row.libraryId ? (
                          <Link to={`/superadmin/libraries/${row.libraryId}`} className="hover:text-emerald-200 hover:underline">
                            {row.libraryName}
                          </Link>
                        ) : (
                          row.libraryName
                        )}
                      </td>
                      <td>
                        <div>{row.ownerName}</div>
                        <div className="text-xs text-white/50">{row.mobile}</div>
                      </td>
                      <td className="font-semibold">{formatInr(row.amount)}</td>
                      <td>{row.planName}</td>
                      <td>
                        <StatusBadge status={row.status} />
                      </td>
                      <td>{formatDate(row.paymentDate)}</td>
                      <td className="max-w-[8rem] truncate font-mono text-xs text-white/70">{row.transactionId}</td>
                      <td>
                        {row.libraryId ? (
                          <Link
                            to={`/superadmin/libraries/${row.libraryId}`}
                            className="text-xs font-semibold text-emerald-200 hover:underline"
                          >
                            Details →
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SuperAdminTableScroll>
          )}
        </div>

        <SuperAdminPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </SaasCard>
    </div>
  );
}
