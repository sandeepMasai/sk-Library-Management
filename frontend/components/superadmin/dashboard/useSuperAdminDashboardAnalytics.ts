import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet, type ApiError } from '../../../services/api';
import type { RecentActivityRow, RecentLibraryRow, RevenueOverview } from './types';

const REFRESH_MS = 60_000;

type SliceState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

function emptySlice<T>(): SliceState<T> {
  return { data: null, loading: true, error: null };
}

export function useSuperAdminDashboardAnalytics(enabled: boolean) {
  const [libraries, setLibraries] = useState<SliceState<RecentLibraryRow[]>>(emptySlice());
  const [activities, setActivities] = useState<SliceState<RecentActivityRow[]>>(emptySlice());
  const [revenue, setRevenue] = useState<SliceState<RevenueOverview>>(emptySlice());
  const [refreshing, setRefreshing] = useState(false);
  const mounted = useRef(true);

  const loadLibraries = useCallback(async () => {
    setLibraries((s) => ({ ...s, loading: s.data == null, error: null }));
    try {
      const res = await apiGet<{ ok: boolean; libraries: RecentLibraryRow[] }>(
        '/api/superadmin/recent-libraries',
        { limit: 8 }
      );
      if (!mounted.current) return;
      setLibraries({ data: res.libraries || [], loading: false, error: null });
    } catch (e) {
      const err = e as ApiError;
      if (!mounted.current) return;
      setLibraries((s) => ({
        ...s,
        loading: false,
        error: err?.message || 'Failed to load libraries',
      }));
    }
  }, []);

  const loadActivities = useCallback(async () => {
    setActivities((s) => ({ ...s, loading: s.data == null, error: null }));
    try {
      const res = await apiGet<{ ok: boolean; activities: RecentActivityRow[] }>(
        '/api/superadmin/recent-activity',
        { limit: 20 }
      );
      if (!mounted.current) return;
      setActivities({ data: res.activities || [], loading: false, error: null });
    } catch (e) {
      const err = e as ApiError;
      if (!mounted.current) return;
      setActivities((s) => ({
        ...s,
        loading: false,
        error: err?.message || 'Failed to load activity',
      }));
    }
  }, []);

  const loadRevenue = useCallback(async () => {
    setRevenue((s) => ({ ...s, loading: s.data == null, error: null }));
    try {
      const res = await apiGet<{ ok: boolean; overview: RevenueOverview }>('/api/superadmin/revenue-overview');
      if (!mounted.current) return;
      setRevenue({ data: res.overview, loading: false, error: null });
    } catch (e) {
      const err = e as ApiError;
      if (!mounted.current) return;
      setRevenue((s) => ({
        ...s,
        loading: false,
        error: err?.message || 'Failed to load revenue',
      }));
    }
  }, []);

  const refreshAll = useCallback(
    async (silent = false) => {
      if (!enabled) return;
      if (!silent) setRefreshing(true);
      await Promise.all([loadLibraries(), loadActivities(), loadRevenue()]);
      if (mounted.current) setRefreshing(false);
    },
    [enabled, loadLibraries, loadActivities, loadRevenue]
  );

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void refreshAll(false);
  }, [enabled, refreshAll]);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => void refreshAll(true), REFRESH_MS);
    return () => clearInterval(id);
  }, [enabled, refreshAll]);

  return {
    libraries,
    activities,
    revenue,
    refreshing,
    refreshAll,
    retryLibraries: loadLibraries,
    retryActivities: loadActivities,
    retryRevenue: loadRevenue,
  };
}
