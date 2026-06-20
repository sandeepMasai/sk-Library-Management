import { SITE } from '../../content/site';
import type { BillingHistoryItem, PlanRow, SubscriptionMe } from '../api/libraryApi';

export type InvoiceStatus = 'paid' | 'pending' | 'failed' | 'refunded';

export type BillToInfo = {
  libraryName: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
};

export type InvoiceBreakdown = {
  planPrice: number;
  discount: number;
  subtotal: number;
  gst: number;
  total: number;
};

export type InvoiceData = {
  invoiceNumber: string;
  date: string;
  plan: string;
  planLabel: string;
  durationLabel: string;
  startDate: string;
  expiryDate: string;
  amount: number;
  status: InvoiceStatus;
  method: string;
  transactionId: string;
  orderId: string;
  breakdown: InvoiceBreakdown;
  billTo: BillToInfo;
};

const AUTHORIZED_SIGNATURE = 'Sandeep Kumar';
const WEBSITE = 'https://smartlibdesk.in';

export function formatBillingDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatMoney(amount: number) {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
}

export function planLabel(plan?: string | null) {
  const key = String(plan || '').toLowerCase();
  if (key === 'trial' || key.includes('trial')) return 'Trial Plan';
  if (key === 'monthly' || key.includes('monthly')) return 'Premium Plan';
  if (key === '6month' || key.includes('6_month') || key.includes('6month')) return 'Premium 6-Month Plan';
  if (key === 'yearly' || key.includes('year')) return 'Premium Plan';
  if (key === 'pro') return 'Premium Plan';
  if (!key || key === 'none') return 'No Plan';
  return plan ? String(plan) : 'Plan';
}

export function planDurationLabel(plan?: string | null, planRow?: PlanRow | null) {
  if (planRow?.isTrial) return 'Trial';
  const days = planRow?.duration;
  if (days && days >= 365) return '1 Year';
  if (days && days >= 180) return '6 Months';
  if (days && days >= 30) return '1 Month';
  const key = String(plan || '').toLowerCase();
  if (key.includes('year')) return '1 Year';
  if (key.includes('6')) return '6 Months';
  if (key.includes('month')) return '1 Month';
  if (key.includes('trial')) return 'Trial';
  return 'Subscription';
}

export function normalizeInvoiceStatus(status?: string | null): InvoiceStatus {
  const s = String(status || '').toLowerCase();
  if (s === 'paid' || s === 'success') return 'paid';
  if (s === 'refunded' || s === 'refund') return 'refunded';
  if (s === 'pending' || s === 'created') return 'pending';
  return 'failed';
}

export function invoiceStatusMeta(status: InvoiceStatus) {
  switch (status) {
    case 'paid':
      return { label: 'Paid', dot: 'bg-emerald-400', badge: 'billing-badge billing-badge--paid' };
    case 'pending':
      return { label: 'Pending', dot: 'bg-amber-400', badge: 'billing-badge billing-badge--pending' };
    case 'refunded':
      return { label: 'Refunded', dot: 'bg-slate-400', badge: 'billing-badge billing-badge--refunded' };
    default:
      return { label: 'Failed', dot: 'bg-red-400', badge: 'billing-badge billing-badge--failed' };
  }
}

export function invoiceNumberFromPayment(item: BillingHistoryItem) {
  const d = item.createdAt ? new Date(item.createdAt) : new Date();
  const year = d.getFullYear();
  const tail = String(item.paymentId || item.orderId || item.id).replace(/\W/g, '').slice(-6).toUpperCase();
  return `INV-${year}-${tail || '001'}`;
}

export type BillToAuthUser = {
  name?: string;
  email?: string;
  mobile?: string;
  ownerName?: string;
  city?: string;
  state?: string;
  library?: { libraryName?: string };
};

function plansMatch(a?: string | null, b?: string | null) {
  const na = String(a || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const nb = String(b || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!na || !nb) return false;
  if (na === nb || na.includes(nb) || nb.includes(na)) return true;
  const groups = [
    ['trial', 'freetrial'],
    ['monthly', 'promonthly'],
    ['6month', 'pro6month', '6months'],
    ['yearly', 'proyearly', 'year'],
  ];
  return groups.some((group) => group.some((g) => na.includes(g)) && group.some((g) => nb.includes(g)));
}

export function billToFromProfile(
  profile: Record<string, unknown> | null | undefined,
  authUser?: BillToAuthUser | null
): BillToInfo {
  const city = String(profile?.city || authUser?.city || '').trim();
  const state = String(profile?.state || authUser?.state || '').trim();
  const addressLine = String(profile?.address || '').trim();
  const place = String(profile?.place || '').trim();
  const pincode = String(profile?.pincode || '').trim();
  const location = [addressLine, place, city, state, pincode].filter(Boolean).join(', ');

  const libraryName = String(
    profile?.libraryName || authUser?.library?.libraryName || ''
  ).trim();
  const ownerName = String(
    profile?.name || profile?.ownerName || authUser?.ownerName || authUser?.name || ''
  ).trim();
  const email = String(profile?.email || authUser?.email || '').trim();
  const phone = String(profile?.phone || authUser?.mobile || '').trim();

  return {
    libraryName: libraryName || 'Your Library',
    ownerName: ownerName || 'Library Owner',
    email: email || '—',
    phone: phone || '—',
    address: location || '—',
  };
}

export function resolveInvoiceSubscriptionPeriod(
  item: BillingHistoryItem & { type: 'payment' },
  history: BillingHistoryItem[],
  sub: SubscriptionMe | null,
  profile: Record<string, unknown> | null | undefined,
  plans: PlanRow[]
): { startDate: string | null; expiryDate: string | null } {
  const paymentMs = item.createdAt ? new Date(item.createdAt).getTime() : NaN;

  const activations = history.filter(
    (h): h is Extract<BillingHistoryItem, { type: 'subscription' }> =>
      h.type === 'subscription' && h.status === 'activated'
  );

  let best: (typeof activations)[number] | null = null;
  let bestDiff = Infinity;
  for (const act of activations) {
    if (!plansMatch(act.plan, item.plan)) continue;
    const actMs = act.createdAt ? new Date(act.createdAt).getTime() : NaN;
    if (!Number.isFinite(actMs) || !Number.isFinite(paymentMs)) continue;
    const diff = Math.abs(actMs - paymentMs);
    if (diff < bestDiff && diff <= 7 * 24 * 60 * 60 * 1000) {
      bestDiff = diff;
      best = act;
    }
  }
  if (best?.createdAt || best?.expiryDate) {
    return { startDate: best.createdAt, expiryDate: best.expiryDate };
  }

  const latestPayment = paymentInvoices(history)[0];
  if (latestPayment?.id === item.id) {
    const startDate = sub?.planStartDate ?? null;
    const expiryDate =
      sub?.planExpiryDate ?? (profile?.planExpiryDate as string | undefined) ?? null;
    if (startDate || expiryDate) return { startDate, expiryDate };
  }

  const planRow = plans.find(
    (p) => p.key === item.plan || plansMatch(p.key, item.plan) || p.key.includes(String(item.plan))
  );
  if (item.createdAt && planRow?.duration) {
    const start = new Date(item.createdAt);
    const expiry = new Date(start);
    expiry.setDate(expiry.getDate() + planRow.duration);
    return { startDate: start.toISOString(), expiryDate: expiry.toISOString() };
  }

  if (item.createdAt) {
    return {
      startDate: item.createdAt,
      expiryDate: sub?.planExpiryDate ?? (profile?.planExpiryDate as string | undefined) ?? null,
    };
  }

  return { startDate: null, expiryDate: null };
}

export function paymentInvoices(items: BillingHistoryItem[]) {
  return items.filter((x): x is BillingHistoryItem & { type: 'payment' } => x.type === 'payment');
}

export function computeBreakdown(amount: number, planRow?: PlanRow | null): InvoiceBreakdown {
  const listPrice = planRow?.strikePrice || planRow?.originalPrice || planRow?.finalPrice || amount;
  const planPrice = Math.max(listPrice, amount);
  const discount = Math.max(0, planPrice - amount);
  const subtotal = amount;
  return {
    planPrice,
    discount,
    subtotal,
    gst: 0,
    total: subtotal,
  };
}

export function buildInvoiceData(
  item: BillingHistoryItem,
  profile: Record<string, unknown> | null | undefined,
  sub: SubscriptionMe | null,
  plans: PlanRow[],
  history: BillingHistoryItem[] = [],
  authUser?: BillToAuthUser | null
): InvoiceData | null {
  if (item.type !== 'payment') return null;
  const planRow = plans.find(
    (p) => p.key === item.plan || plansMatch(p.key, item.plan) || p.key.includes(String(item.plan))
  );
  const period = resolveInvoiceSubscriptionPeriod(item, history, sub, profile, plans);
  return {
    invoiceNumber: invoiceNumberFromPayment(item),
    date: formatBillingDate(item.createdAt),
    plan: String(item.plan || ''),
    planLabel: planLabel(item.plan),
    durationLabel: planDurationLabel(item.plan, planRow),
    startDate: formatBillingDate(period.startDate),
    expiryDate: formatBillingDate(period.expiryDate),
    amount: item.amount,
    status: normalizeInvoiceStatus(item.status),
    method: 'Razorpay',
    transactionId: item.paymentId || '—',
    orderId: item.orderId || '—',
    breakdown: computeBreakdown(item.amount, planRow),
    billTo: billToFromProfile(profile, authUser),
  };
}

export function computeBillingSummary(
  items: BillingHistoryItem[],
  sub: SubscriptionMe | null,
  plans: PlanRow[],
  profile?: Record<string, unknown> | null
) {
  const invoices = paymentInvoices(items);
  const paid = invoices.filter((x) => normalizeInvoiceStatus(x.status) === 'paid');
  const lastPayment = paid[0] ?? invoices[0] ?? null;
  const totalPaid = paid.reduce((sum, x) => sum + Number(x.amount || 0), 0);
  const planKey = sub?.currentPlanKey || sub?.plan || String(profile?.plan || '');
  const planRow = plans.find(
    (p) => p.key === planKey || plansMatch(p.key, planKey) || p.key.includes(String(planKey))
  );
  const currentPlanLabel = planLabel(planKey);
  const currentPlanPrice = planRow?.finalPrice ?? lastPayment?.amount ?? 0;
  const status =
    sub?.subscriptionStatus || String(profile?.subscriptionStatus || 'inactive');
  const isActive = status === 'active' || status === 'trial';

  return {
    currentPlanLabel,
    currentPlanPrice,
    lastPaymentAmount: lastPayment?.amount ?? 0,
    lastPaymentDate: lastPayment?.createdAt ?? null,
    nextRenewal: sub?.planExpiryDate ?? (profile?.planExpiryDate as string | undefined) ?? null,
    planStartDate: sub?.planStartDate ?? null,
    totalPaid,
    status,
    isActive,
    paymentMethod: 'Razorpay',
  };
}

export function daysRemaining(expiry?: string | null) {
  if (!expiry) return null;
  const diff = Math.ceil((new Date(expiry).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  return diff;
}

export function planUsagePercent(start?: string | null, expiry?: string | null) {
  if (!start || !expiry) return 0;
  const startMs = new Date(start).getTime();
  const endMs = new Date(expiry).getTime();
  const now = Date.now();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return 0;
  const total = endMs - startMs;
  const used = Math.min(Math.max(now - startMs, 0), total);
  return Math.round((used / total) * 100);
}

export function buildInvoiceHtml(invoice: InvoiceData) {
  const status = invoiceStatusMeta(invoice.status);
  const { breakdown, billTo } = invoice;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${invoice.invoiceNumber} · ${SITE.name}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; padding: 32px; color: #0f172a; background: #f8fafc; }
    .sheet { max-width: 760px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; }
    .header { display: flex; justify-content: space-between; gap: 24px; padding: 28px 32px; background: linear-gradient(135deg, #6d28d9, #7c3aed); color: #fff; }
    .brand { font-size: 24px; font-weight: 800; letter-spacing: -0.02em; }
    .brand-sub { margin-top: 4px; font-size: 12px; opacity: 0.85; }
    .meta { text-align: right; font-size: 13px; }
    .meta strong { display: block; font-size: 18px; margin-bottom: 8px; }
    .body { padding: 28px 32px; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b; margin-bottom: 10px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .info p { margin: 4px 0; font-size: 14px; line-height: 1.5; }
    .info .name { font-size: 18px; font-weight: 800; margin-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px 0; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 14px; }
    th { color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; }
    .amount-row td:last-child, .amount-row th:last-child { text-align: right; }
    .total-row td { border-bottom: none; padding-top: 16px; font-size: 18px; font-weight: 800; color: #6d28d9; }
    .badge { display: inline-block; padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 800; }
    .paid { background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }
    .pending { background: #fffbeb; color: #d97706; border: 1px solid #fde68a; }
    .failed { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
    .refunded { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
    .footer { padding: 24px 32px 32px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; gap: 24px; align-items: flex-end; }
    .terms { font-size: 11px; color: #64748b; max-width: 360px; line-height: 1.6; }
    .signature { text-align: right; }
    .signature-line { width: 180px; border-top: 1px solid #cbd5e1; margin-left: auto; padding-top: 8px; }
    .signature-name { font-family: "Segoe Script", "Brush Script MT", cursive; font-size: 28px; color: #334155; line-height: 1; margin-bottom: 6px; }
    .signature-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; }
    .thank-you { text-align: center; padding: 16px 32px 28px; color: #64748b; font-size: 13px; font-weight: 600; }
    @media print {
      body { background: #fff; padding: 0; }
      .sheet { border: none; border-radius: 0; max-width: none; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div>
        <div class="brand">${SITE.name}</div>
        <div class="brand-sub">${SITE.supportEmail} · ${WEBSITE.replace(/^https?:\/\//, '')}</div>
      </div>
      <div class="meta">
        <strong>Invoice</strong>
        <div>${invoice.invoiceNumber}</div>
        <div>Date: ${invoice.date}</div>
      </div>
    </div>

    <div class="body">
      <div class="grid-2">
        <div class="section">
          <div class="section-title">Bill To</div>
          <div class="info">
            <p class="name">${billTo.libraryName}</p>
            <p><strong>Owner:</strong> ${billTo.ownerName}</p>
            <p><strong>Email:</strong> ${billTo.email}</p>
            <p><strong>Phone:</strong> ${billTo.phone}</p>
            <p>${billTo.address}</p>
          </div>
        </div>
        <div class="section">
          <div class="section-title">Subscription Details</div>
          <div class="info">
            <p class="name">${invoice.planLabel}</p>
            <p><strong>Duration:</strong> ${invoice.durationLabel}</p>
            <p><strong>Start:</strong> ${invoice.startDate}</p>
            <p><strong>Expiry:</strong> ${invoice.expiryDate}</p>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Amount Breakdown</div>
        <table>
          <thead>
            <tr class="amount-row">
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr class="amount-row"><td>Plan Price</td><td>${formatMoney(breakdown.planPrice)}</td></tr>
            <tr class="amount-row"><td>Discount</td><td>-${formatMoney(breakdown.discount)}</td></tr>
            <tr class="amount-row"><td>Subtotal</td><td>${formatMoney(breakdown.subtotal)}</td></tr>
            <tr class="total-row amount-row"><td>Total</td><td>${formatMoney(breakdown.total)}</td></tr>
          </tbody>
        </table>
      </div>

      <div class="grid-2">
        <div class="section">
          <div class="section-title">Payment Method</div>
          <div class="info">
            <p><strong>Method:</strong> ${invoice.method}</p>
            <p><strong>Transaction ID:</strong> ${invoice.transactionId}</p>
            <p><strong>Order ID:</strong> ${invoice.orderId}</p>
          </div>
        </div>
        <div class="section">
          <div class="section-title">Payment Status</div>
          <span class="badge ${invoice.status}">${status.label}</span>
        </div>
      </div>
    </div>

    <div class="thank-you">Thank you for choosing ${SITE.name}</div>

    <div class="footer">
      <div class="terms">
        <strong>Terms &amp; Conditions</strong><br />
        This invoice is generated electronically and is valid without a physical signature.
        Subscription access is subject to SmartLibDesk terms of service. For billing support, contact ${SITE.supportEmail}.
      </div>
      <div class="signature">
        <div class="signature-name">${AUTHORIZED_SIGNATURE}</div>
        <div class="signature-line">
          <div class="signature-label">Authorized Signature</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function printInvoiceHtml(html: string) {
  const win = window.open('', '_blank', 'noopener,noreferrer');
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 350);
}

export function downloadInvoiceHtml(html: string, filename: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${filename}.html`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function shareInvoiceHtml(html: string, title: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const file = new File([blob], `${title}.html`, { type: 'text/html' });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ title, text: `${SITE.name} invoice`, files: [file] });
    return;
  }
  if (navigator.share) {
    await navigator.share({ title, text: `${SITE.name} invoice — open the downloaded HTML file to view.` });
    downloadInvoiceHtml(html, title);
    return;
  }
  downloadInvoiceHtml(html, title);
}

export { AUTHORIZED_SIGNATURE, WEBSITE };
