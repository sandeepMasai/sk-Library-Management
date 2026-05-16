/** Plan category filters (libraries + payment ledger). */
export type PlanTypeFilter = 'all' | 'free' | 'pro' | 'trial' | 'none';

export type PaymentStatusFilter = 'all' | 'paid' | 'pending' | 'failed' | 'refunded';

export type FilterSheetValues = {
  search: string;
  planType: PlanTypeFilter;
  paymentStatus?: PaymentStatusFilter;
};

export const DEFAULT_FILTER_SHEET: FilterSheetValues = {
  search: '',
  planType: 'all',
  paymentStatus: 'all',
};

export const PLAN_GRID_OPTIONS: {
  key: Exclude<PlanTypeFilter, 'all'>;
  label: string;
  subtitle: string;
  accent: string;
  icon: 'gift' | 'crown' | 'sparkles' | 'minus';
}[] = [
  { key: 'free', label: 'FREE', subtitle: 'No paid plan', accent: '#64748B', icon: 'gift' },
  { key: 'pro', label: 'PRO', subtitle: 'Active subscription', accent: '#4F46E5', icon: 'crown' },
  { key: 'trial', label: 'TRIAL', subtitle: 'Trial period', accent: '#0EA5E9', icon: 'sparkles' },
  { key: 'none', label: 'NONE', subtitle: 'Not assigned', accent: '#94A3B8', icon: 'minus' },
];

export const PAYMENT_STATUS_OPTIONS: { key: PaymentStatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'paid', label: 'Success' },
  { key: 'pending', label: 'Pending' },
  { key: 'failed', label: 'Failed' },
  { key: 'refunded', label: 'Refunded' },
];

export function countActiveSheetFilters(v: FilterSheetValues, includePaymentStatus = false): number {
  let n = 0;
  if (v.planType !== 'all') n += 1;
  if (includePaymentStatus && v.paymentStatus && v.paymentStatus !== 'all') n += 1;
  return n;
}

/** Maps UI planType → backend library `planKey` query param. */
export function planTypeToLibraryPlanKey(planType: PlanTypeFilter): string | undefined {
  if (planType === 'all') return undefined;
  return planType;
}

/** Maps UI planType → backend payments `plan` query (pro → monthly family handled server-side). */
export function planTypeToPaymentPlan(planType: PlanTypeFilter): string | undefined {
  if (planType === 'all') return undefined;
  if (planType === 'pro') return 'pro';
  if (planType === 'free' || planType === 'none') return 'none';
  return planType;
}
