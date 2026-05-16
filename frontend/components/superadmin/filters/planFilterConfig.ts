import type { PlanTypeFilter } from './types';

export type PlanCardKey = Exclude<PlanTypeFilter, 'all'>;

export type PlanCardIcon = 'free' | 'pro' | 'trial' | 'none';

export type PlanCardConfig = {
  key: PlanCardKey;
  label: string;
  icon: PlanCardIcon;
  accent: string;
  gradient: readonly [string, string, string];
  glow: string;
};

export const PLAN_FILTER_CARDS: PlanCardConfig[] = [
  {
    key: 'free',
    label: 'FREE',
    icon: 'free',
    accent: '#94A3B8',
    gradient: ['#64748B', '#94A3B8', '#CBD5E1'],
    glow: 'rgba(148,163,184,0.45)',
  },
  {
    key: 'pro',
    label: 'PRO',
    icon: 'pro',
    accent: '#818CF8',
    gradient: ['#6366F1', '#22D3EE', '#A78BFA'],
    glow: 'rgba(99,102,241,0.65)',
  },
  {
    key: 'trial',
    label: 'TRIAL',
    icon: 'trial',
    accent: '#FBBF24',
    gradient: ['#F59E0B', '#FBBF24', '#FDE68A'],
    glow: 'rgba(245,158,11,0.5)',
  },
  {
    key: 'none',
    label: 'NONE',
    icon: 'none',
    accent: '#F87171',
    gradient: ['#EF4444', '#F87171', '#FCA5A5'],
    glow: 'rgba(239,68,68,0.4)',
  },
];

export function planCardByKey(key: PlanCardKey): PlanCardConfig {
  return PLAN_FILTER_CARDS.find((c) => c.key === key) ?? PLAN_FILTER_CARDS[0];
}
