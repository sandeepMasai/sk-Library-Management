import type { PublicPlan } from '../lib/plansApi';

const DEFAULT_FEATURES = [
  'Full library dashboard',
  'Student & seat management',
  'QR attendance',
  'Secure Razorpay billing',
];

export function formatInr(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    amount
  );
}

export function formatPlanDuration(plan: Pick<PublicPlan, 'duration' | 'isTrial'>) {
  const days = Number(plan.duration || 0);
  if (plan.isTrial) return `${days} day${days === 1 ? '' : 's'} trial`;
  if (days >= 365) return `${days} days · 1 year`;
  if (days >= 180) return `${days} days · 6 months`;
  if (days >= 90) return `${days} days · 3 months`;
  if (days >= 30) return `${days} days · 1 month`;
  return `${days} day${days === 1 ? '' : 's'}`;
}

export function planDisplayTag(plan: PublicPlan): string | null {
  if (plan.tag?.trim()) return plan.tag.trim();
  if (plan.badges?.bestValue) return 'Best value';
  if (plan.badges?.recommended) return 'Popular';
  if (plan.badges?.limitedTime) return 'Limited time';
  if (plan.isTrial) return 'Start here';
  return null;
}

export function isPlanHighlighted(plan: PublicPlan) {
  const tag = planDisplayTag(plan)?.toLowerCase() || '';
  return (
    plan.badges?.recommended ||
    tag.includes('popular') ||
    tag.includes('best')
  );
}

export function planFeatureList(plan: PublicPlan): string[] {
  if (plan.features?.length) return plan.features;
  const lines: string[] = [];
  if (plan.description?.trim()) lines.push(plan.description.trim());
  if (plan.isOneTimeOffer) lines.push('One-time introductory offer');
  if (plan.discount && plan.discount > 0) lines.push(`${plan.discount}% discount applied`);
  if (plan.savings && plan.savings > 0) lines.push(`Save ${formatInr(plan.savings)} vs list price`);
  if (plan.campaignName?.trim()) lines.push(plan.campaignName.trim());
  return lines.length ? [...lines, ...DEFAULT_FEATURES.slice(0, 2)] : DEFAULT_FEATURES;
}

export function formatPlansUpdatedAt(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
