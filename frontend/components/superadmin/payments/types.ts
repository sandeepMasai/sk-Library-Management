import type { PaymentStatusFilter, PlanTypeFilter } from '../filters/types';

export type PaymentStatus = 'paid' | 'pending' | 'failed' | 'refunded' | 'cancelled';

export type PaymentRow = {
  id: string;
  libraryId: string | null;
  libraryName: string;
  ownerName: string;
  mobile: string;
  email: string;
  transactionId: string;
  razorpayPaymentId: string;
  amount: number;
  planName: string;
  planKey?: string;
  status: PaymentStatus | string;
  paymentDate: string | null;
  expiryDate: string | null;
  subscriptionActive: boolean;
  isExpired: boolean;
};

export type PaymentsOverview = {
  totalRevenue: number;
  monthlyRevenue: number;
  todayRevenue: number;
  growthPercent: number;
  pendingPayments: number;
  failedPayments: number;
  activeSubscriptions: number;
  sparkline: { date: string; revenue: number }[];
  subscriptionMix: { active: number; expired: number };
  statusCounts: Record<string, number>;
};

export type PaymentsTotals = {
  totalRevenue: number;
  successCount: number;
  pendingCount: number;
  pendingTotal: number;
  failedCount: number;
  failedTotal: number;
};

export type PaymentFilters = {
  search: string;
  planType: PlanTypeFilter;
  paymentStatus: PaymentStatusFilter;
  libraryStatus: string;
  from: string;
  to: string;
};

export const DEFAULT_PAYMENT_FILTERS: PaymentFilters = {
  search: '',
  planType: 'all',
  paymentStatus: 'all',
  libraryStatus: 'all',
  from: '',
  to: '',
};

/** Drop orphan ledger rows (deleted library / missing name). */
export function isPaymentWithLibrary(row: PaymentRow): boolean {
  if (!row.libraryId) return false;
  const name = String(row.libraryName || '').trim();
  return name.length > 0 && name !== '—' && name !== '-';
}

export function countActivePaymentFilters(filters: PaymentFilters): number {
  let n = 0;
  if (filters.paymentStatus !== 'all') n += 1;
  if (filters.planType !== 'all') n += 1;
  if (filters.libraryStatus !== 'all') n += 1;
  if (filters.from.trim()) n += 1;
  if (filters.to.trim()) n += 1;
  return n;
}

export function paymentFiltersToSheetValues(filters: PaymentFilters) {
  return {
    search: filters.search,
    planType: filters.planType,
    paymentStatus: filters.paymentStatus,
  };
}

export function sheetValuesToPaymentFilters(
  sheet: { search: string; planType: PlanTypeFilter; paymentStatus?: PaymentStatusFilter },
  prev: PaymentFilters
): PaymentFilters {
  return {
    ...prev,
    search: sheet.search,
    planType: sheet.planType,
    paymentStatus: sheet.paymentStatus || 'all',
  };
}
