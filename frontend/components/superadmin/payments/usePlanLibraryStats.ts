import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '../../../services/api';
import type { PlanTypeFilter } from '../filters/types';

export type PlanLibraryCounts = Record<PlanTypeFilter, number>;

const EMPTY_COUNTS: PlanLibraryCounts = {
  all: 0,
  free: 0,
  pro: 0,
  trial: 0,
  none: 0,
};

const PLAN_TYPES: PlanTypeFilter[] = ['all', 'free', 'pro', 'trial', 'none'];

async function fetchLibraryCount(planType: PlanTypeFilter): Promise<number> {
  const res = await apiGet<{ ok?: boolean; total?: number }>('/api/admin/libraries', {
    page: 1,
    limit: 1,
    ...(planType !== 'all' ? { planType } : {}),
  });
  return Number(res.total || 0);
}

/** Library counts per plan bucket — uses existing admin libraries API (no new backend). */
export function usePlanLibraryStats(enabled: boolean) {
  const [counts, setCounts] = useState<PlanLibraryCounts>(EMPTY_COUNTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const totals = await Promise.all(PLAN_TYPES.map((planType) => fetchLibraryCount(planType)));
      setCounts({
        all: totals[0],
        free: totals[1],
        pro: totals[2],
        trial: totals[3],
        none: totals[4],
      });
    } catch {
      setError('Could not load plan stats');
      setCounts(EMPTY_COUNTS);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  return { counts, loading, error, reload: load };
}
