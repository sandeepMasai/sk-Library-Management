import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../../context/AuthContext';
import {
  fetchBillingHistory,
  fetchLibraryProfile,
  fetchPlans,
  fetchSubscriptionMe,
  type BillingHistoryItem,
  type PlanRow,
  type SubscriptionMe,
} from '../../api/libraryApi';
import {
  billToFromProfile,
  buildInvoiceData,
  buildInvoiceHtml,
  computeBillingSummary,
  daysRemaining,
  downloadInvoiceHtml,
  formatBillingDate,
  formatMoney,
  invoiceNumberFromPayment,
  invoiceStatusMeta,
  normalizeInvoiceStatus,
  paymentInvoices,
  planDurationLabel,
  planLabel,
  planUsagePercent,
  printInvoiceHtml,
  type InvoiceData,
  type InvoiceStatus,
} from '../../utils/billingHelpers';
import { InvoicePreviewModal } from './InvoicePreviewModal';
import { SettingsEmptyState } from './SettingsPrimitives';

type StatusFilter = 'all' | InvoiceStatus;

function SummaryTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="billing-summary-tile admin-card rounded-2xl p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-white/55">{label}</p>
      <p className="mt-2 text-lg font-bold text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-white/50">{hint}</p> : null}
    </div>
  );
}

export function BillingSection() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [sub, setSub] = useState<SubscriptionMe | null>(null);
  const [history, setHistory] = useState<BillingHistoryItem[]>([]);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [previewInvoice, setPreviewInvoice] = useState<InvoiceData | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [profileRes, subRes, items, planRows] = await Promise.all([
          fetchLibraryProfile(),
          fetchSubscriptionMe(),
          fetchBillingHistory(),
          fetchPlans(),
        ]);
        if (!alive) return;
        setProfile((profileRes.profile || null) as Record<string, unknown> | null);
        setSub(subRes);
        setHistory(items);
        setPlans(planRows);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : 'Failed to load billing history');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const billTo = useMemo(() => billToFromProfile(profile, user), [profile, user]);
  const summary = useMemo(
    () => computeBillingSummary(history, sub, plans, profile),
    [history, sub, plans, profile]
  );
  const planStartDate = summary.planStartDate ?? null;
  const planExpiryDate = summary.nextRenewal;
  const invoices = useMemo(() => paymentInvoices(history), [history]);
  const days = daysRemaining(planExpiryDate);
  const usage = planUsagePercent(planStartDate, planExpiryDate);
  const planRow = plans.find(
    (p) => p.key === sub?.currentPlanKey || p.key.includes(String(sub?.currentPlanKey || sub?.plan || ''))
  );

  const filteredInvoices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((item) => {
      const status = normalizeInvoiceStatus(item.status);
      if (statusFilter !== 'all' && status !== statusFilter) return false;

      if (dateFrom) {
        const fromMs = new Date(dateFrom).getTime();
        const createdMs = item.createdAt ? new Date(item.createdAt).getTime() : NaN;
        if (Number.isFinite(fromMs) && Number.isFinite(createdMs) && createdMs < fromMs) return false;
      }
      if (dateTo) {
        const toMs = new Date(`${dateTo}T23:59:59`).getTime();
        const createdMs = item.createdAt ? new Date(item.createdAt).getTime() : NaN;
        if (Number.isFinite(toMs) && Number.isFinite(createdMs) && createdMs > toMs) return false;
      }

      if (!q) return true;
      const invoiceNo = invoiceNumberFromPayment(item).toLowerCase();
      return (
        invoiceNo.includes(q) ||
        String(item.orderId || '').toLowerCase().includes(q) ||
        String(item.paymentId || '').toLowerCase().includes(q) ||
        planLabel(item.plan).toLowerCase().includes(q)
      );
    });
  }, [invoices, search, statusFilter, dateFrom, dateTo]);

  const latestPaidInvoice = useMemo(() => {
    const paid = invoices.filter((x) => normalizeInvoiceStatus(x.status) === 'paid');
    return paid[0] ?? null;
  }, [invoices]);

  function openInvoice(item: BillingHistoryItem) {
    const data = buildInvoiceData(item, profile, sub, plans, history, user);
    if (data) setPreviewInvoice(data);
  }

  function downloadLatestInvoice() {
    if (!latestPaidInvoice) return;
    const data = buildInvoiceData(latestPaidInvoice, profile, sub, plans, history, user);
    if (!data) return;
    printInvoiceHtml(buildInvoiceHtml(data));
  }

  function downloadInvoiceItem(item: BillingHistoryItem) {
    const data = buildInvoiceData(item, profile, sub, plans, history, user);
    if (!data) return;
    downloadInvoiceHtml(buildInvoiceHtml(data), data.invoiceNumber);
  }

  const statusBadge = summary.isActive ? 'billing-badge billing-badge--paid' : 'billing-badge billing-badge--pending';

  return (
    <section className="billing-section space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-white">Billing &amp; Subscription</h2>
          <p className="mt-1 max-w-2xl text-sm text-white/70">
            Manage plans, payments, invoices, renewals, and billing history.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/subscription">
            <Button>Upgrade Plan</Button>
          </Link>
          <Link to="/admin/subscription">
            <Button variant="outline">Renew Subscription</Button>
          </Link>
          <Button variant="outline" disabled={!latestPaidInvoice} onClick={downloadLatestInvoice}>
            Download Latest Invoice
          </Button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
        <div className="billing-plan-card overflow-hidden rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-700 via-purple-700 to-indigo-800 p-6 shadow-xl shadow-violet-950/30">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/70">Current Plan</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h3 className="font-display text-3xl font-bold text-white">{summary.currentPlanLabel}</h3>
                <span className={statusBadge}>
                  <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-400" />
                  {summary.isActive ? 'Active' : summary.status}
                </span>
              </div>
              <p className="mt-3 text-2xl font-bold text-white">
                {formatMoney(summary.currentPlanPrice)}
                <span className="ml-2 text-sm font-semibold text-white/70">
                  / {planDurationLabel(sub?.currentPlanKey || sub?.plan, planRow)}
                </span>
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 text-2xl" aria-hidden>
              💎
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/10 px-4 py-3">
              <p className="text-xs font-semibold uppercase text-white/60">Start Date</p>
              <p className="mt-1 text-sm font-bold text-white">{formatBillingDate(planStartDate)}</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3">
              <p className="text-xs font-semibold uppercase text-white/60">Expiry Date</p>
              <p className="mt-1 text-sm font-bold text-white">{formatBillingDate(planExpiryDate)}</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3">
              <p className="text-xs font-semibold uppercase text-white/60">Days Remaining</p>
              <p className="mt-1 text-sm font-bold text-emerald-300">
                {days != null ? `${Math.max(0, days)} Days` : '—'}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-white/70">
              <span>Plan usage</span>
              <span>{usage}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${usage}%` }} />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-bold text-white">Billing Summary</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <SummaryTile label="Current Plan" value={summary.currentPlanLabel} />
            <SummaryTile
              label="Last Payment"
              value={summary.lastPaymentAmount ? formatMoney(summary.lastPaymentAmount) : '—'}
              hint={summary.lastPaymentDate ? formatBillingDate(summary.lastPaymentDate) : undefined}
            />
            <SummaryTile
              label="Next Renewal"
              value={formatBillingDate(summary.nextRenewal)}
              hint={days != null ? `${Math.max(0, days)} days left` : undefined}
            />
            <SummaryTile label="Total Paid" value={formatMoney(summary.totalPaid)} hint="All time" />
            <SummaryTile label="Payment Method" value={summary.paymentMethod} />
            <SummaryTile label="Status" value={summary.isActive ? 'Active' : summary.status} />
          </div>
        </div>
      </div>

      <div className="admin-card rounded-3xl p-5">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white">Payment History</h3>
            <p className="text-sm text-white/60">Subscription invoices and Razorpay payments.</p>
          </div>
          <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[520px]">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40">🔍</span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search invoice, order ID, plan…"
                className="focus-ring-brand w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/40"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {(['all', 'paid', 'pending', 'failed', 'refunded'] as StatusFilter[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition ${
                    statusFilter === key
                      ? 'bg-primary text-white'
                      : 'border border-white/15 bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  {key === 'all' ? 'All' : key}
                </button>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                aria-label="Filter from date"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                aria-label="Filter to date"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="admin-skeleton h-14 rounded-xl" />
            <div className="admin-skeleton h-14 rounded-xl" />
            <div className="admin-skeleton h-14 rounded-xl" />
          </div>
        ) : error ? (
          <SettingsEmptyState icon="⚠️" title="Could not load billing history" description={error} />
        ) : filteredInvoices.length === 0 ? (
          <SettingsEmptyState
            icon="🧾"
            title="No invoices found"
            description="Your subscription invoices will appear here after successful payments."
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-2xl border border-white/10 lg:block">
              <table className="billing-table min-w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs font-semibold uppercase tracking-wide text-white/55">
                    <th className="px-4 py-3">Invoice No</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredInvoices.map((item) => {
                    const status = normalizeInvoiceStatus(item.status);
                    const meta = invoiceStatusMeta(status);
                    return (
                      <tr key={item.id} className="hover:bg-white/5">
                        <td className="px-4 py-3 font-medium text-white">{invoiceNumberFromPayment(item)}</td>
                        <td className="px-4 py-3 text-white/70">{formatBillingDate(item.createdAt)}</td>
                        <td className="px-4 py-3 text-white/80">{planLabel(item.plan)}</td>
                        <td className="px-4 py-3 font-semibold text-white">{formatMoney(item.amount)}</td>
                        <td className="px-4 py-3">
                          <span className={meta.badge}>
                            <span className={`mr-2 inline-block h-2 w-2 rounded-full ${meta.dot}`} />
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openInvoice(item)}
                              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
                            >
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => downloadInvoiceItem(item)}
                              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
                            >
                              Download
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 lg:hidden">
              {filteredInvoices.map((item) => {
                const status = normalizeInvoiceStatus(item.status);
                const meta = invoiceStatusMeta(status);
                return (
                  <div key={item.id} className="billing-invoice-card admin-card rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{invoiceNumberFromPayment(item)}</p>
                        <p className="mt-1 text-sm text-white/60">{formatBillingDate(item.createdAt)}</p>
                      </div>
                      <span className={meta.badge}>{meta.label}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-white/70">{planLabel(item.plan)}</span>
                      <span className="font-bold text-white">{formatMoney(item.amount)}</span>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => openInvoice(item)}
                        className="flex-1 rounded-xl border border-white/15 py-2 text-sm font-semibold text-white hover:bg-white/10"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadInvoiceItem(item)}
                        className="flex-1 rounded-xl border border-white/15 py-2 text-sm font-semibold text-white hover:bg-white/10"
                      >
                        Download PDF
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="admin-card rounded-2xl p-5">
          <p className="text-sm font-bold text-white">Billing Information</p>
          <div className="mt-3 space-y-2 text-sm text-white/70">
            <p>{billTo.libraryName}</p>
            <p>{billTo.email}</p>
            <p>{billTo.phone}</p>
          </div>
        </div>
        <div className="admin-card rounded-2xl p-5">
          <p className="text-sm font-bold text-white">Payment Methods</p>
          <p className="mt-3 text-sm text-white/70">Razorpay · UPI, Cards, Net Banking</p>
          <p className="mt-2 text-xs text-white/50">Payments are processed securely via Razorpay checkout.</p>
        </div>
        <div className="admin-card rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-white">Auto Renewal</p>
              <p className="mt-1 text-xs text-white/50">Renew before expiry from the subscription page.</p>
            </div>
            <label className="billing-toggle">
              <input type="checkbox" defaultChecked disabled aria-label="Auto renewal" />
              <span />
            </label>
          </div>
        </div>
        <div className="admin-card rounded-2xl p-5">
          <p className="text-sm font-bold text-white">Need Help?</p>
          <p className="mt-2 text-sm text-white/70">Contact support for billing questions or invoice corrections.</p>
          <a href="mailto:support@smartlibdesk.in" className="mt-3 inline-block text-sm font-semibold text-primary">
            Contact Support
          </a>
        </div>
      </div>

      <InvoicePreviewModal
        open={Boolean(previewInvoice)}
        invoice={previewInvoice}
        onClose={() => setPreviewInvoice(null)}
      />
    </section>
  );
}
