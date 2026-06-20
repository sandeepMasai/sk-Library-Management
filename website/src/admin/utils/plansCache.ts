import type { PlanRow } from '../api/libraryApi';

const CACHE_KEY = 'sld_admin_plans_v1';
const TTL_MS = 5 * 60 * 1000;

type CacheEntry = { ts: number; plans: PlanRow[] };

export function readPlansCache(): PlanRow[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    if (!entry?.plans?.length || Date.now() - entry.ts > TTL_MS) return null;
    return entry.plans;
  } catch {
    return null;
  }
}

export function writePlansCache(plans: PlanRow[]): void {
  try {
    if (!plans.length) return;
    const entry: CacheEntry = { ts: Date.now(), plans };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearPlansCache(): void {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}
